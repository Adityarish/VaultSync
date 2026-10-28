"use client";

import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, AppWindow, Archive, CheckCircle2, FileJson2, PackagePlus, Search, ShieldAlert, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { addFiles } from "@/lib/backup-engine";
import { parseApplicationInventory } from "@/lib/application-inventory";
import { formatBytes } from "@/lib/file-utils";
import { localDb } from "@/lib/local-db";
import { useRemoteBackups } from "@/lib/remote-backups";
import { useMe } from "./connection-badge";
import { DriveConnectButton } from "./drive-connect-button";
import { LibraryView } from "./library-view";

const MAX_INVENTORY_BYTES = 2 * 1024 * 1024;

export function ApplicationBackupsView() {
  const me = useMe();
  const { data = [] } = useRemoteBackups();
  const apkInput = useRef<HTMLInputElement>(null);
  const inventoryInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string }>();
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(50);
  const appBackups = useMemo(() => data.filter((item) => item.category === "apks" || item.category === "app-inventory"), [data]);
  const latestInventoryBackup = appBackups.find((item) => item.category === "app-inventory");
  const queuedAppItems = useLiveQuery(async () => {
    const records = await localDb.files.where("category").anyOf("apks", "app-inventory").toArray();
    return records.filter((record) => !record.verifiedAt);
  }, []) ?? [];
  const inventory = useQuery({
    queryKey: ["application-inventory", latestInventoryBackup?.id],
    enabled: Boolean(latestInventoryBackup),
    queryFn: async () => {
      if (!latestInventoryBackup) return null;
      if (Number(latestInventoryBackup.size_bytes) > MAX_INVENTORY_BYTES) throw new Error("The latest inventory is too large to preview safely.");
      const response = await fetch(`/api/drive/files/${encodeURIComponent(latestInventoryBackup.id)}/download`, { cache: "no-store" });
      if (!response.ok) throw new Error("The latest application inventory could not be opened.");
      return parseApplicationInventory(await response.text());
    },
  });
  const matchingApps = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (inventory.data?.apps ?? []).filter((app) => !normalized || `${app.displayName} ${app.packageName} ${app.versionName ?? ""}`.toLowerCase().includes(normalized));
  }, [inventory.data, query]);

  const queueApks = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const invalid = selected.find((file) => !/\.(apk|apks|xapk)$/i.test(file.name));
    if (invalid) return setMessage({ kind: "error", text: `${invalid.name} is not an APK, APKS, or XAPK file.` });
    try {
      const result = await addFiles(selected, "apks");
      setMessage({ kind: "success", text: `${result.added} application package${result.added === 1 ? "" : "s"} added to the backup queue.${result.duplicatesSkipped ? ` ${result.duplicatesSkipped} duplicate${result.duplicatesSkipped === 1 ? " was" : "s were"} skipped.` : ""}` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "The application packages could not be queued." });
    } finally {
      if (apkInput.current) apkInput.current.value = "";
    }
  };

  const queueInventory = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_INVENTORY_BYTES) throw new Error(`Application inventories must be ${formatBytes(MAX_INVENTORY_BYTES)} or smaller.`);
      parseApplicationInventory(await file.text());
      await addFiles([file], "app-inventory");
      setMessage({ kind: "success", text: "Application inventory validated and added to the backup queue." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "The application inventory could not be imported." });
    } finally {
      if (inventoryInput.current) inventoryInput.current.value = "";
    }
  };

  const authenticated = Boolean(me.data?.authenticated);
  const mock = Boolean(me.data?.mockData);
  const apkBackups = appBackups.filter((item) => item.category === "apks");
  const inventoryBackups = appBackups.filter((item) => item.category === "app-inventory");

  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-3">
      <Metric icon={Archive} label="Verified packages" value={String(apkBackups.length)} detail={formatBytes(apkBackups.reduce((sum, item) => sum + Number(item.size_bytes), 0))}/>
      <Metric icon={FileJson2} label="Inventory snapshots" value={String(inventoryBackups.length)} detail={inventory.data?.deviceName ?? "Android companion export"}/>
      <Metric icon={AppWindow} label="Apps in latest inventory" value={inventory.isLoading ? "…" : String(inventory.data?.apps.length ?? 0)} detail={latestInventoryBackup ? new Date(latestInventoryBackup.verified_at).toLocaleDateString() : "No inventory backed up"}/>
    </section>

    <section className="glass rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-[10px] uppercase tracking-[.18em] text-[#70d6df]">Add an application backup</p><h2 className="mt-1 text-xl font-semibold">Packages and inventory</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">Select APK/APKS/XAPK packages you are allowed to keep, or import a schema-version-1 JSON inventory exported by the Android companion. Files remain queued until you start the backup.</p></div>
        {mock ? <span className="rounded-xl border border-[#ff9188]/20 bg-[#ff9188]/10 px-4 py-3 text-xs text-[#ffaaa3]">Upload is disabled in demo mode</span> : authenticated ? <div className="flex flex-wrap gap-2">
          <input ref={apkInput} className="hidden" type="file" multiple accept=".apk,.apks,.xapk,application/vnd.android.package-archive" onChange={(event) => void queueApks(event.target.files)}/>
          <input ref={inventoryInput} className="hidden" type="file" accept=".json,application/json" onChange={(event) => void queueInventory(event.target.files)}/>
          <button type="button" onClick={() => apkInput.current?.click()} className="gradient-button rounded-xl px-4 py-3 text-xs font-semibold"><PackagePlus className="mr-2 inline" size={15}/>Choose packages</button>
          <button type="button" onClick={() => inventoryInput.current?.click()} className="rounded-xl border border-white/10 bg-white/[.045] px-4 py-3 text-xs"><Upload className="mr-2 inline" size={15}/>Import inventory</button>
        </div> : <DriveConnectButton className="gradient-button rounded-xl px-5 py-3 text-xs font-semibold"/>}
      </div>
      {message && <div role={message.kind === "error" ? "alert" : "status"} className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs ${message.kind === "error" ? "border-red-300/15 bg-red-300/[.06] text-red-100" : "border-emerald-300/15 bg-emerald-300/[.06] text-emerald-100"}`}>{message.kind === "error" ? <AlertCircle className="mt-0.5 shrink-0" size={14}/> : <CheckCircle2 className="mt-0.5 shrink-0" size={14}/>}<span>{message.text} {message.kind === "success" && <Link href="/" className="ml-1 underline underline-offset-2">Open the queue to start backup.</Link>}</span></div>}
      {queuedAppItems.length > 0 && <p className="mt-4 text-xs text-amber-200">{queuedAppItems.length} application backup item{queuedAppItems.length === 1 ? " is" : "s are"} waiting locally in the queue.</p>}
    </section>

    <section className="glass rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#9b7bff]">Latest Android inventory</p><h2 className="mt-1 text-xl font-semibold">Installed application list</h2><p className="mt-2 text-xs text-[var(--muted)]">Metadata only; this does not include private app data, sessions, or passwords.</p></div>{inventory.data && <span className="text-xs text-[var(--muted)]">Exported {new Date(inventory.data.exportedAt).toLocaleString()}</span>}</div>
      {inventory.isLoading ? <div className="mt-5 h-32 animate-pulse rounded-2xl bg-white/[.04]"/> : inventory.error ? <Empty icon={AlertCircle} text={inventory.error.message}/> : !inventory.data ? <Empty icon={FileJson2} text="Import and complete an application inventory backup to list apps here."/> : <>
        <label className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3"><Search size={16} className="text-[var(--muted)]"/><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(50); }} placeholder="Search app name, package, or version" className="w-full bg-transparent py-3 text-sm outline-none"/></label>
        <div className="mt-4 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)]">{matchingApps.slice(0, visible).map((app) => <div key={`${app.packageName}-${app.versionCode ?? app.versionName ?? "unknown"}`} className="flex flex-col gap-2 bg-white/[.015] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium">{app.displayName}</p><p className="truncate text-[11px] text-[var(--muted)]">{app.packageName}</p></div><div className="flex shrink-0 items-center gap-3 text-[11px] text-[var(--muted)]"><span>{app.versionName ? `v${app.versionName}` : "Version unavailable"}</span><span className={app.apkBackupFilename ? "text-emerald-300" : "text-[var(--muted)]"}>{app.apkBackupFilename ? "Package linked" : "Inventory only"}</span></div></div>)}</div>
        {matchingApps.length === 0 && <p className="py-8 text-center text-xs text-[var(--muted)]">No applications match this search.</p>}
        {visible < matchingApps.length && <button type="button" onClick={() => setVisible((current) => current + 50)} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs">Show 50 more ({matchingApps.length - visible} remaining)</button>}
      </>}
    </section>

    <section><div className="mb-4"><p className="text-[10px] uppercase tracking-[.18em] text-[#ff9188]">All verified application backups</p><h2 className="mt-1 text-xl font-semibold">Recovery artifacts</h2></div><LibraryView mode="list" categories={["apks", "app-inventory"]}/></section>

    <div className="flex gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-xs leading-relaxed text-amber-100"><ShieldAlert className="shrink-0" size={18}/><p>Android always requires confirmation before installing an APK. VaultSync cannot back up or restore another app&apos;s protected data, login session, banking data, or private messages. Use each app&apos;s official export or cloud-backup feature for that data.</p></div>
  </div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Archive; label: string; value: string; detail: string }) {
  return <article className="soft-card rounded-2xl p-5"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">{label}</span><Icon size={17} className="text-[#70d6df]"/></div><strong className="mt-4 block text-3xl tracking-[-.04em]">{value}</strong><span className="mt-1 block truncate text-[11px] text-[var(--muted)]">{detail}</span></article>;
}

function Empty({ icon: Icon, text }: { icon: typeof AlertCircle; text: string }) {
  return <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-[var(--line)] px-5 py-12 text-center text-sm text-[var(--muted)]"><Icon className="mb-3" size={22}/>{text}</div>;
}
