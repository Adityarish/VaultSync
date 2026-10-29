"use client";

import { ContactRound, Download, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { downloadDriveFile, fetchDriveFile } from "@/lib/drive-client";
import type { RemoteBackupItem } from "@/lib/remote-backups";
import { parseVCard, type VCardContact } from "@/lib/vcard";
import { ContactDetail } from "./contact-detail";

export function VcfContactDialog({ item, onClose }: { item?: RemoteBackupItem; onClose: () => void }) {
  const [contacts, setContacts] = useState<VCardContact[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!item) return;
    const controller = new AbortController();
    setContacts([]); setSelectedId(undefined); setQuery(""); setError(undefined); setLoading(true);
    void (async () => {
      try {
        const response = await fetchDriveFile(item, { signal: controller.signal });
        const parsed = parseVCard(await response.text());
        if (!parsed.length) throw new Error("No readable contacts were found in this VCF file.");
        setContacts(parsed);
        setSelectedId(parsed[0]?.id);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setError(loadError instanceof Error ? loadError.message : "This VCF file could not be opened.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [item, onClose]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) => `${contact.name} ${contact.phones.join(" ")} ${contact.emails.join(" ")}`.toLowerCase().includes(normalized));
  }, [contacts, query]);
  const selected = contacts.find((contact) => contact.id === selectedId);
  if (!item) return null;

  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#050711]/85 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="vcf-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="glass flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px]">
      <header className="flex items-start justify-between gap-4 border-b border-white/[.08] px-4 py-4 sm:px-6"><div className="min-w-0"><p className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#70d6df]"><ContactRound size={14}/>VCF contact browser</p><h2 id="vcf-dialog-title" className="mt-1 truncate text-lg font-semibold">{item.original_filename}</h2><p className="mt-1 text-xs text-[var(--muted)]">{loading ? "Reading contacts privately…" : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`}</p></div><button type="button" onClick={onClose} aria-label="Close contact browser" className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.05] text-[var(--muted)] hover:text-[var(--ink)]"><X size={18}/></button></header>
      {loading ? <div className="grid min-h-80 place-items-center text-sm text-[var(--muted)]"><span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={18}/>Loading contacts from Drive…</span></div> : error ? <div className="m-5 rounded-2xl border border-red-300/15 bg-red-300/[.06] p-5 text-sm text-red-100">{error}</div> : <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(260px,.78fr)_minmax(0,1.22fr)]">
        <section className="flex min-h-0 flex-col border-b border-white/[.08] p-4 md:border-b-0 md:border-r sm:p-5"><label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-black/10 px-3"><Search size={15} className="text-[var(--muted)]"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or number" className="w-full bg-transparent py-3 text-sm outline-none"/></label><p className="mt-3 text-[10px] text-[var(--muted)]">{visible.length} result{visible.length === 1 ? "" : "s"}</p><div className="mt-2 max-h-56 space-y-1.5 overflow-auto pr-1 md:max-h-none md:flex-1">{visible.map((contact) => <button type="button" key={contact.id} onClick={() => setSelectedId(contact.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === contact.id ? "border-[#70d6df]/30 bg-[#70d6df]/[.09]" : "border-transparent bg-black/10 hover:border-white/10"}`}><b className="block truncate text-sm">{contact.name || "Unnamed contact"}</b><span className="mt-1 block truncate text-xs text-[var(--muted)]">{contact.phones[0] ?? contact.emails[0] ?? "No phone or email"}</span></button>)}{visible.length === 0 && <p className="py-10 text-center text-sm text-[var(--muted)]">No contacts match your search.</p>}</div></section>
        <main className="min-h-0 overflow-auto p-4 sm:p-5">{selected ? <ContactDetail contact={selected}/> : <div className="grid min-h-60 place-items-center text-sm text-[var(--muted)]">Choose a contact to see every phone number.</div>}</main>
      </div>}
      <footer className="flex flex-col gap-2 border-t border-white/[.08] px-4 py-3 text-[10px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>Contact data stays in this browser preview.</span><button type="button" onClick={() => void downloadDriveFile(item)} className="flex items-center gap-1.5 text-[#c2b3ff] hover:underline"><Download size={13}/>Download original VCF</button></footer>
    </div>
  </div>;
}
