"use client";

import { motion } from "motion/react";
import { Check, Download, FileArchive, FileAudio, FileImage, FileText, Film, Search, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBytes } from "@/lib/file-utils";
import { useRemoteBackups, type RemoteBackupItem } from "@/lib/remote-backups";

export function LibraryView({ categories, mode = "grid" }: { categories: string[]; mode?: "grid" | "list" }) {
  const { data = [], isLoading, error } = useRemoteBackups();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const items = useMemo(() => data.filter((item) => categories.includes(item.category) && (category === "all" || item.category === category) && `${item.original_filename} ${item.original_relative_path}`.toLowerCase().includes(query.toLowerCase())), [data, categories, category, query]);
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const downloadSelected = () => {
    const selectedItems = items.filter((item) => selected.has(item.id));
    for (const item of selectedItems) {
      const anchor = document.createElement("a");
      anchor.href = `/api/drive/files/${encodeURIComponent(item.id)}/download`;
      anchor.download = item.original_filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  };
  return <div>
    <div className="flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3"><Search size={16} className="text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search verified backups" className="w-full bg-transparent py-3 text-sm outline-none"/></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm"><option value="all">All types</option>{categories.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></div>
    {selected.size > 0 && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#70d6df]/20 bg-[#70d6df]/[.07] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><span>{selected.size} selected</span><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[var(--muted)]">Your browser controls each destination.</span><button type="button" onClick={() => setSelected(new Set())} className="rounded-lg border border-white/10 px-3 py-2"><X className="mr-1 inline" size={13}/>Clear</button><button type="button" onClick={downloadSelected} className="gradient-button rounded-lg px-3 py-2 font-semibold"><Download className="mr-1 inline" size={13}/>Download selected</button></div></div>}
    {isLoading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[.04]"/>)}</div> : error ? <Empty text={error.message}/> : items.length === 0 ? <Empty text="No verified backups match this view yet."/> : <div className={`mt-5 grid gap-3 ${mode === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>{items.map((item, index) => <LibraryCard key={item.id} item={item} selected={selected.has(item.id)} onToggle={() => toggle(item.id)} index={index} compact={mode === "list"}/>)}</div>}
  </div>;
}

function LibraryCard({ item, selected, onToggle, index, compact }: { item: RemoteBackupItem; selected: boolean; onToggle: () => void; index: number; compact: boolean }) {
  const Icon = iconFor(item);
  return <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .035, .25) }} className={`soft-card group relative rounded-2xl ${compact ? "flex items-center gap-4 p-4" : "p-4"}`}>
    <button type="button" onClick={onToggle} aria-pressed={selected} aria-label={selected ? "Deselect file" : "Select file"} className={`absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-full border ${selected ? "border-[#70d6df] bg-[#70d6df] text-[#081016]" : "border-white/15 bg-black/20 text-transparent"}`}><Check size={14}/></button>
    <div className={`grid shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,rgba(155,123,255,.18),rgba(94,211,226,.08))] text-[#a78cff] ${compact ? "size-12" : "h-28 w-full"}`}><Icon size={compact ? 21 : 34}/></div>
    <div className={compact ? "min-w-0 flex-1" : "mt-4"}><p className="truncate pr-8 text-sm font-medium">{item.original_filename}</p><div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--muted)]"><span>{formatBytes(Number(item.size_bytes))}</span><span>·</span><span>{new Date(item.verified_at).toLocaleDateString()}</span></div><div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-1 text-[10px] text-emerald-300"><ShieldCheck size={12}/>Checksum recorded</span><a href={`/api/drive/files/${item.id}/download`} className="grid size-8 place-items-center rounded-lg bg-white/[.05] text-[var(--muted)] hover:text-[var(--ink)]" aria-label={`Download ${item.original_filename}`}><Download size={15}/></a></div></div>
  </motion.article>;
}
function iconFor(item: RemoteBackupItem) { if (item.category === "photos") return FileImage; if (item.category === "videos") return Film; if (item.category === "audio") return FileAudio; if (item.mime_type.includes("zip")) return FileArchive; return FileText; }
function Empty({ text }: { text: string }) { return <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] px-5 py-16 text-center text-sm text-[var(--muted)]">{text}</div>; }
function title(value: string) { return value.replace("-", " ").replace(/^./, (char) => char.toUpperCase()); }
