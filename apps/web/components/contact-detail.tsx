"use client";

import { AtSign, Download, MapPin, Phone, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { exportContactToDevice } from "@/lib/contact-export";
import type { VCardContact } from "@/lib/vcard";

export function ContactDetail({ contact }: { contact: VCardContact }) {
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string>();
  useEffect(() => setNotice(undefined), [contact.id]);

  const exportContact = async () => {
    setExporting(true);
    try {
      const result = await exportContactToDevice(contact);
      if (result === "shared") setNotice("Contact sent to your device share sheet.");
      if (result === "downloaded") setNotice("Contact exported as a VCF file. Open it to add it to your address book.");
    } finally {
      setExporting(false);
    }
  };

  return <section className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.16em] text-[#70d6df]">Contact details</p><h3 className="mt-1 break-words text-xl font-semibold">{contact.name || "Unnamed contact"}</h3></div><button type="button" disabled={exporting} onClick={() => void exportContact()} className="gradient-button shrink-0 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50"><Download className="mr-1.5 inline" size={14}/>{exporting ? "Exporting…" : "Export to device"}</button></div>
    {notice && <p role="status" className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] p-3 text-xs text-emerald-100">{notice}</p>}
    <div className="mt-5 space-y-4">
      <DetailGroup icon={Phone} label="Phone numbers" empty="No phone number in this contact">{contact.phones.map((phone) => <a key={phone} href={`tel:${phone}`} className="block break-all text-sm text-[#8de6ee] hover:underline">{phone}</a>)}</DetailGroup>
      <DetailGroup icon={AtSign} label="Email addresses" empty="No email address in this contact">{contact.emails.map((email) => <a key={email} href={`mailto:${email}`} className="block break-all text-sm text-[#c2b3ff] hover:underline">{email}</a>)}</DetailGroup>
      {contact.addresses.length > 0 && <DetailGroup icon={MapPin} label="Addresses">{contact.addresses.map((address) => <p key={address} className="text-sm leading-relaxed text-[var(--muted)]">{address}</p>)}</DetailGroup>}
      {contact.notes.length > 0 && <DetailGroup icon={StickyNote} label="Notes">{contact.notes.map((note) => <p key={note} className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{note}</p>)}</DetailGroup>}
    </div>
  </section>;
}

function DetailGroup({ icon: Icon, label, empty, children }: { icon: typeof Phone; label: string; empty?: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div><p className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-[var(--muted)]"><Icon size={13}/>{label}</p>{hasChildren ? <div className="space-y-1.5">{children}</div> : <p className="text-xs text-[var(--muted)]">{empty}</p>}</div>;
}
