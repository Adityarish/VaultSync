"use client";

import { motion } from "motion/react";
import { Check, ContactRound, Download, FileArchive, FileAudio, FileImage, FileText, Film, LoaderCircle, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { downloadDriveFile, fetchDriveFile } from "@/lib/drive-client";
import { formatBytes } from "@/lib/file-utils";
import { useRemoteBackups, type RemoteBackupItem } from "@/lib/remote-backups";
import { useMe } from "./connection-badge";
import { VcfContactDialog } from "./vcf-contact-dialog";

export function LibraryView({ categories, mode = "grid" }: { categories: string[]; mode?: "grid" | "list" }) {
  const { data = [], isLoading, error } = useRemoteBackups();
  const me = useMe();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<RemoteBackupItem>();
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string }>();
  const items = useMemo(() => data.filter((item) => categories.includes(item.category) && (category === "all" || item.category === category) && `${item.original_filename} ${item.original_relative_path}`.toLowerCase().includes(query.toLowerCase())), [data, categories, category, query]);
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const downloadSelected = async () => {
    const selectedItems = items.filter((item) => selected.has(item.id));
    setNotice(undefined);
    try {
      for (const item of selectedItems) await downloadDriveFile(item, Boolean(me.data?.mockData));
    } catch (downloadError) {
      setNotice({ kind: "error", text: downloadError instanceof Error ? downloadError.message : "The selected files could not be downloaded." });
    }
  };
  const deleteItems = async (targets: RemoteBackupItem[]) => {
    if (!targets.length || !window.confirm(`Permanently delete ${targets.length === 1 ? `“${targets[0]!.original_filename}”` : `${targets.length} files`} from Google Drive and VaultSync? This cannot be undone.`)) return;
    const targetIds = new Set(targets.map((item) => item.id));
    setDeleting((current) => new Set([...current, ...targetIds]));
    setNotice(undefined);
    const failed: string[] = [];
    for (const item of targets) {
      try {
        const response = await fetch(`/api/backups/items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(body.error || "Delete failed");
      } catch (deleteError) {
        failed.push(`${item.original_filename}: ${deleteError instanceof Error ? deleteError.message : "Delete failed"}`);
      }
    }
    setDeleting((current) => { const next = new Set(current); for (const id of targetIds) next.delete(id); return next; });
    if (failed.length) setNotice({ kind: "error", text: failed[0]! + (failed.length > 1 ? ` (+${failed.length - 1} more)` : "") });
    else setNotice({ kind: "success", text: `${targets.length} file${targets.length === 1 ? "" : "s"} permanently deleted.` });
    setSelected((current) => { const next = new Set(current); for (const id of targetIds) next.delete(id); return next; });
    await queryClient.invalidateQueries({ queryKey: ["remote-backups"] });
  };
  const selectedItems = data.filter((item) => selected.has(item.id));
  return <div>
    <div className="flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3"><Search size={16} className="text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search verified backups" className="w-full bg-transparent py-3 text-sm outline-none"/></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm"><option value="all">All types</option>{categories.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></div>
    {selected.size > 0 && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#70d6df]/20 bg-[#70d6df]/[.07] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><span>{selected.size} selected</span><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[var(--muted)]">Your browser controls each download destination.</span><button type="button" onClick={() => setSelected(new Set())} className="rounded-lg border border-white/10 px-3 py-2"><X className="mr-1 inline" size={13}/>Clear</button>{!me.data?.mockData && <button type="button" disabled={deleting.size > 0} onClick={() => void deleteItems(selectedItems)} className="rounded-lg border border-red-300/20 bg-red-300/[.06] px-3 py-2 text-red-100 disabled:opacity-50"><Trash2 className="mr-1 inline" size={13}/>Delete selected</button>}<button type="button" onClick={() => void downloadSelected()} className="gradient-button rounded-lg px-3 py-2 font-semibold"><Download className="mr-1 inline" size={13}/>Download selected</button></div></div>}
    {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-4 rounded-xl border px-4 py-3 text-xs ${notice.kind === "error" ? "border-red-300/15 bg-red-300/[.06] text-red-100" : "border-emerald-300/15 bg-emerald-300/[.06] text-emerald-100"}`}>{notice.text}</p>}
    {isLoading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[.04]"/>)}</div> : error ? <Empty text={error.message}/> : items.length === 0 ? <Empty text="No verified backups match this view yet."/> : <div className={`mt-5 grid gap-3 ${mode === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>{items.map((item, index) => <LibraryCard key={item.id} item={item} selected={selected.has(item.id)} onToggle={() => toggle(item.id)} onDelete={() => void deleteItems([item])} onDownload={() => void downloadDriveFile(item, Boolean(me.data?.mockData)).catch((downloadError) => setNotice({ kind: "error", text: downloadError instanceof Error ? downloadError.message : "This file could not be downloaded." }))} onOpenVcf={isVcf(item) ? () => setPreviewItem(item) : undefined} deleting={deleting.has(item.id)} canDelete={!me.data?.mockData} index={index} compact={mode === "list"}/>)}</div>}
    <VcfContactDialog item={previewItem} onClose={() => setPreviewItem(undefined)}/>
  </div>;
}

function LibraryCard({ item, selected, onToggle, onDelete, onDownload, onOpenVcf, deleting, canDelete, index, compact }: { item: RemoteBackupItem; selected: boolean; onToggle: () => void; onDelete: () => void; onDownload: () => void; onOpenVcf?: () => void; deleting: boolean; canDelete: boolean; index: number; compact: boolean }) {
  const Icon = iconFor(item);
  return <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .035, .25) }} className={`soft-card group relative rounded-2xl ${compact ? "flex items-center gap-4 p-4" : "p-4"}`}>
    <button type="button" onClick={onToggle} aria-pressed={selected} aria-label={selected ? "Deselect file" : "Select file"} className={`absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-full border ${selected ? "border-[#70d6df] bg-[#70d6df] text-[#081016]" : "border-white/15 bg-black/20 text-transparent"}`}><Check size={14}/></button>
    {compact ? <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,rgba(155,123,255,.18),rgba(94,211,226,.08))] text-[#a78cff]"><Icon size={21}/></div> : <MediaPreview item={item} fallbackIcon={Icon}/>} 
    <div className={compact ? "min-w-0 flex-1" : "mt-4"}><p className="truncate pr-8 text-sm font-medium">{item.original_filename}</p><div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--muted)]"><span>{formatBytes(Number(item.size_bytes))}</span><span>·</span><span>{new Date(item.verified_at).toLocaleDateString()}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1 text-[10px] text-emerald-300"><ShieldCheck size={12}/>Checksum recorded</span><div className="flex flex-wrap items-center justify-end gap-1">{onOpenVcf && <button type="button" onClick={onOpenVcf} className="flex h-8 items-center gap-1.5 rounded-lg bg-[#70d6df]/[.09] px-2.5 text-[10px] font-medium text-[#8de6ee] hover:bg-[#70d6df]/[.14]"><ContactRound size={14}/>Open contacts</button>}{canDelete && <button type="button" disabled={deleting} onClick={onDelete} className="grid size-8 place-items-center rounded-lg bg-red-300/[.05] text-red-200 hover:bg-red-300/[.1] disabled:cursor-wait disabled:opacity-50" aria-label={`Delete ${item.original_filename}`}>{deleting ? <LoaderCircle className="animate-spin" size={15}/> : <Trash2 size={15}/>}</button>}<button type="button" onClick={onDownload} className="grid size-8 place-items-center rounded-lg bg-white/[.05] text-[var(--muted)] hover:text-[var(--ink)]" aria-label={`Download ${item.original_filename}`} title="Download"><Download size={15}/></button></div></div></div>
  </motion.article>;
}

function MediaPreview({ item, fallbackIcon: Icon }: { item: RemoteBackupItem; fallbackIcon: typeof FileImage }) {
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState<string>();
  const isPhoto = item.category === "photos";
  const isVideo = item.category === "videos";
  useEffect(() => {
    if (!isPhoto && !isVideo) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void fetchDriveFile(item, { signal: controller.signal }).then((response) => response.blob()).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch((previewError) => { if (!(previewError instanceof DOMException && previewError.name === "AbortError")) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [isPhoto, isVideo, item]);
  if (failed || (!isPhoto && !isVideo)) return <div className="grid h-40 w-full place-items-center rounded-2xl bg-[linear-gradient(145deg,rgba(155,123,255,.18),rgba(94,211,226,.08))] text-[#a78cff]"><Icon size={36}/></div>;
  if (!source) return <div className="grid h-40 w-full place-items-center rounded-2xl bg-black/25 text-[var(--muted)]"><LoaderCircle className="animate-spin" size={22}/></div>;
  if (isVideo) return <div className="h-40 w-full overflow-hidden rounded-2xl bg-black/35"><video src={source} controls playsInline preload="metadata" onError={() => setFailed(true)} className="size-full object-contain" aria-label={`Preview ${item.original_filename}`}/></div>;
  return <div className="h-40 w-full overflow-hidden rounded-2xl bg-black/25"><img src={source} alt={`Preview of ${item.original_filename}`} loading="lazy" onError={() => setFailed(true)} className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"/></div>;
}
function iconFor(item: RemoteBackupItem) { if (item.category === "photos") return FileImage; if (item.category === "videos") return Film; if (item.category === "audio") return FileAudio; if (item.mime_type.includes("zip")) return FileArchive; return FileText; }
function isVcf(item: RemoteBackupItem) { return item.category === "contacts" || item.original_filename.toLowerCase().endsWith(".vcf") || /(?:vcard|x-vcard)/i.test(item.mime_type); }
function Empty({ text }: { text: string }) { return <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] px-5 py-16 text-center text-sm text-[var(--muted)]">{text}</div>; }
function title(value: string) { return value.replace("-", " ").replace(/^./, (char) => char.toUpperCase()); }
