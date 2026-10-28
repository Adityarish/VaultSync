"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArchiveRestore, ArrowUpRight, CheckCircle2, ChevronRight, Cloud, FileCheck2, FileImage, FileText, FolderOpen, Gauge, LoaderCircle, Pause, Play, RefreshCw, ShieldCheck, UploadCloud, Video, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { addFiles, cancelPending, getQueueVersion, pauseQueue, startQueue, subscribeQueue } from "@/lib/backup-engine";
import { formatBytes } from "@/lib/file-utils";
import { localDb } from "@/lib/local-db";
import { useRemoteBackups } from "@/lib/remote-backups";
import { useMe } from "./connection-badge";
import { PageHeader } from "./page-header";
import { DriveConnectButton } from "./drive-connect-button";

const categories = [
  { key: "photos", label: "Photos", icon: FileImage, color: "#b77cff" }, { key: "videos", label: "Videos", icon: Video, color: "#5ecedd" },
  { key: "documents", label: "Documents", icon: FileText, color: "#ff8a7d" }, { key: "contacts", label: "Contacts", icon: FileCheck2, color: "#6bd4a5" },
] as const;

export function Dashboard() {
  useSyncExternalStore(subscribeQueue, getQueueVersion, () => 0);
  const online = useSyncExternalStore(subscribeOnline, readOnline, () => true);
  const me = useMe();
  const remoteBackups = useRemoteBackups();
  const isMock = Boolean(me.data?.mockData);
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string>();
  const [dayGreeting, setDayGreeting] = useState("day");
  const queue = useLiveQuery(() => localDb.queue.orderBy("createdAt").reverse().toArray(), []) ?? [];
  const files = useLiveQuery(() => localDb.files.toArray(), []) ?? [];
  const latestRun = useLiveQuery(() => localDb.runs.orderBy("createdAt").last(), []);
  const active = queue.some((item) => item.state === "uploading" || item.state === "hashing");
  const pending = queue.some((item) => ["queued", "paused", "failed"].includes(item.state));
  const mockFiles = isMock ? remoteBackups.data ?? [] : [];
  const protectedBytes = isMock ? mockFiles.reduce((sum, file) => sum + Number(file.size_bytes), 0) : files.filter((file) => file.verifiedAt).reduce((sum, file) => sum + file.size, 0);
  const protectedCount = isMock ? mockFiles.length : files.filter((file) => file.verifiedAt).length;
  const current = queue.find((item) => item.state === "uploading" || item.state === "hashing");
  const currentFile = current ? files.find((file) => file.id === current.localFileId) : undefined;

  useEffect(() => setDayGreeting(greeting()), []);

  const onFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    setAdding(true); setAddError(undefined);
    try { await addFiles(Array.from(selected)); }
    catch (error) { setAddError(error instanceof Error ? error.message : "The selected files could not be added to browser storage."); }
    finally { setAdding(false); if (input.current) input.current.value = ""; if (folderInput.current) folderInput.current.value = ""; }
  };

  return <>
    <PageHeader eyebrow="Private cloud backup" title={`Good ${dayGreeting}${me.data?.user?.name ? `, ${me.data.user.name.split(" ")[0]}` : ""}.`} description="Your files travel directly from this device to your Google Drive. VaultSync keeps only the metadata needed to help you recover them." action={<div className="flex items-center gap-3">{isMock && <span className="rounded-full border border-[#ff9188]/25 bg-[#ff9188]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#ffaaa3]">Demo data</span>}<span className={`size-2 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`}/><span className="text-xs text-[var(--muted)]">{online ? "Online" : "Offline"}</span></div>} />
    <div className="relative px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 grid-fade" />
      <div className="relative grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <section className="glass overflow-hidden rounded-[28px] p-5 sm:p-7">
          <div className="flex items-start justify-between"><div><p className="text-[11px] uppercase tracking-[.16em] text-[var(--muted)]">Protected by VaultSync</p><div className="mt-2 flex items-baseline gap-2"><strong className="text-4xl tracking-[-.05em]">{formatBytes(protectedBytes)}</strong><span className="text-xs text-[var(--muted)]">verified</span></div></div><div className="grid size-11 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><ShieldCheck size={21}/></div></div>
          <div className="mt-7 grid gap-5 sm:grid-cols-[190px_1fr] sm:items-center">
            <div className="relative mx-auto grid size-44 place-items-center rounded-full mesh-ring p-[12px]"><div className="grid size-full place-items-center rounded-full bg-[var(--panel)] text-center"><span><b className="block text-3xl">{protectedCount}</b><small className="text-[var(--muted)]">protected files</small></span></div></div>
            <div className="grid grid-cols-2 gap-2.5">{categories.map(({ key, label, icon: Icon, color }) => { const count = isMock ? mockFiles.filter((f) => f.category === key).length : files.filter((f) => f.category === key && f.verifiedAt).length; return <Link href={key === "photos" || key === "videos" ? "/gallery" : key === "contacts" ? "/contacts" : "/files"} key={key} className="soft-card group rounded-2xl p-3.5 transition hover:-translate-y-0.5 hover:border-white/20"><Icon size={17} style={{ color }}/><div className="mt-5 flex items-end justify-between"><span><b className="block text-lg">{count}</b><small className="text-[var(--muted)]">{label}</small></span><ChevronRight size={15} className="text-[var(--muted)] transition group-hover:translate-x-1"/></div></Link>; })}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#ff8a7d]/20 bg-[linear-gradient(145deg,rgba(255,125,120,.11),rgba(155,123,255,.07),rgba(12,14,30,.8))] p-5 sm:p-6">
          <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-[#ff837c]/15 text-[#ff968e]"><UploadCloud size={21}/></span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">Direct to Drive</span></div>
          <h2 className="mt-7 text-2xl font-semibold tracking-[-.04em]">Back up this device</h2><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Choose files or a folder. Nothing uploads until you review and start the queue.</p>
          <input ref={input} className="hidden" type="file" multiple onChange={(event) => void onFiles(event.target.files)} />
          <input ref={folderInput} className="hidden" type="file" multiple {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={(event) => void onFiles(event.target.files)} />
          {addError && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-300/15 bg-red-300/[.06] p-3 text-xs text-red-100"><AlertCircle className="mt-0.5 shrink-0" size={14}/>{addError}</p>}
          {isMock ? <Link href="/gallery" className="gradient-button mt-6 flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold">Explore the demo library <ArrowUpRight className="ml-2" size={16}/></Link> : me.data?.authenticated ? <div className="mt-6 grid grid-cols-2 gap-2"><button type="button" onClick={() => input.current?.click()} className="gradient-button rounded-xl px-4 py-3 text-sm font-semibold">Choose files</button><button type="button" onClick={() => folderInput.current?.click()} className="rounded-xl border border-white/10 bg-white/[.045] px-4 py-3 text-sm"><FolderOpen className="mr-2 inline" size={16}/>Folder</button></div> : <DriveConnectButton className="gradient-button mt-6 flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold"/>}
          <p className="mt-4 flex items-center gap-2 text-[11px] text-[var(--muted)]"><Cloud size={13}/>{isMock ? "Preview only — no files are uploaded." : "Uses the limited drive.file permission."}</p>
        </section>
      </div>

      <div className="relative mt-5 grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <section className="glass rounded-[28px] p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#70d6df]">Transfer queue</p><h2 className="mt-1 text-xl font-semibold">{isMock ? "Latest backup is healthy" : currentFile ? currentFile.name : pending ? "Ready to back up" : "All quiet"}</h2></div>{(latestRun || isMock) && <span className="rounded-full bg-white/[.05] px-3 py-1 text-xs text-[var(--muted)]">{isMock ? "demo complete" : latestRun?.state}</span>}</div>
          {isMock ? <div className="mt-6"><div className="mb-2 flex justify-between text-xs text-[var(--muted)]"><span>{protectedCount} files · {formatBytes(protectedBytes)}</span><span>100%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full w-full rounded-full bg-[linear-gradient(90deg,#9c72ff,#5ed4de)]"/></div><p className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={15}/>Mock backup finished with checksum verification.</p></div> : current ? <div className="mt-6"><div className="mb-2 flex justify-between text-xs text-[var(--muted)]"><span>{current.state === "hashing" ? "Calculating SHA-256" : `${formatBytes(current.uploadedBytes)} / ${formatBytes(currentFile?.size ?? 0)}`}</span><span>{current.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#9c72ff,#5ed4de)]" animate={{ width: `${Math.max(current.progress, current.state === "hashing" ? 7 : 0)}%` }}/></div></div> : <div className="mt-6 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-[var(--muted)]">{adding ? <><LoaderCircle className="mr-2 animate-spin" size={17}/>Adding files securely…</> : pending ? `${queue.filter((q) => ["queued", "paused", "failed"].includes(q.state)).length} item(s) waiting` : "Select files to create a recoverable backup."}</div>}
          <div className="mt-5 flex flex-wrap gap-2">{isMock ? <Link href="/history" className="gradient-button rounded-xl px-4 py-2 text-xs font-semibold">View demo history</Link> : <>{active ? <button type="button" onClick={pauseQueue} className="rounded-xl bg-white/10 px-4 py-2 text-xs"><Pause className="mr-2 inline" size={14}/>Pause</button> : <button type="button" disabled={!pending || !me.data?.authenticated} onClick={() => void startQueue()} className="gradient-button rounded-xl px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"><Play className="mr-2 inline" size={14}/>{queue.some((q) => q.state === "failed") ? "Retry safely" : "Start backup"}</button>}<button type="button" disabled={!pending && !active} onClick={() => void cancelPending()} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-[var(--muted)] disabled:opacity-30"><X className="mr-2 inline" size={14}/>Cancel pending</button></>}</div>
          <AnimatePresence>{queue.filter((item) => item.state === "failed").slice(0, 2).map((item) => <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} key={item.id} className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[.06] p-3 text-xs text-red-200"><RefreshCw className="mr-2 inline" size={13}/>{item.error}</motion.div>)}</AnimatePresence>
        </section>
        <section className="soft-card rounded-[28px] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Recovery readiness</p><h2 className="mt-1 text-xl font-semibold">{protectedCount > 0 ? "Backups verified" : "No snapshot yet"}</h2></div><Gauge size={22} className="text-[#70d6df]"/></div><div className="mt-6 space-y-3">{[[CheckCircle2,"Checksums recorded",protectedCount > 0],[ArchiveRestore,"Restore center ready",protectedCount > 0],[Cloud,isMock ? "Demo Drive" : "Drive access",Boolean(me.data?.authenticated)]].map(([Icon,label,ok]) => { const ItemIcon = Icon as typeof CheckCircle2; return <div key={String(label)} className="flex items-center justify-between rounded-xl bg-black/10 px-3 py-3 text-xs"><span className="flex items-center gap-2"><ItemIcon size={15}/>{String(label)}</span><span className={ok ? "text-emerald-300" : "text-[var(--muted)]"}>{ok ? "Ready" : "Pending"}</span></div>; })}</div><Link href="/restore" className="mt-5 flex items-center justify-between text-xs text-[#ff9188]">Open Restore Center <ChevronRight size={15}/></Link></section>
      </div>
    </div>
  </>;
}

function greeting() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"; }
function readOnline() { return navigator.onLine; }
function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
