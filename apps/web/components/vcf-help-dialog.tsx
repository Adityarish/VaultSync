"use client";

import { Apple, CircleHelp, ExternalLink, FileDown, FileUp, ShieldCheck, Smartphone, X } from "lucide-react";
import { useRef, useState } from "react";

type Platform = "iphone" | "android";

const guides = {
  iphone: {
    label: "iPhone",
    icon: Apple,
    accent: "text-slate-100",
    exportSteps: [
      "Open the Contacts app and tap Lists in the top-left corner.",
      "Touch and hold the contact list you want to back up, then tap Export.",
      "Choose the contact fields to include and tap Done.",
      "Use the share sheet to save or send the exported contact cards, then select that .vcf file in VaultSync.",
    ],
    restoreSteps: [
      "Download the verified .vcf backup from VaultSync.",
      "Send it to the iPhone as a Mail or Messages attachment if needed.",
      "Tap the .vcf attachment and follow the Contacts prompt to add its contacts.",
    ],
    source: "https://support.apple.com/guide/iphone/export-contacts-iph075ddebf2/ios",
    restoreSource: "https://support.apple.com/guide/iphone/import-contacts-iph356499f31/ios",
  },
  android: {
    label: "Android",
    icon: Smartphone,
    accent: "text-emerald-300",
    exportSteps: [
      "Open the Contacts app.",
      "Open Menu, then Settings, and choose Export.",
      "Choose the account or contacts to export.",
      "Tap Export to .VCF file, save it, then select that file in VaultSync.",
    ],
    restoreSteps: [
      "Download the verified .vcf backup from VaultSync.",
      "Open Contacts and tap Organise, then Import from file.",
      "Choose the destination Google account, locate the .vcf file, and confirm the import.",
    ],
    source: "https://support.google.com/contacts/answer/7199294?co=GENIE.Platform%3DAndroid",
    restoreSource: "https://support.google.com/contacts/answer/15147365?co=GENIE.Platform%3DAndroid",
  },
} as const;

export function VcfHelpButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [platform, setPlatform] = useState<Platform>("iphone");
  const guide = guides[platform];
  const GuideIcon = guide.icon;

  const close = () => dialog.current?.close();

  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="flex w-fit items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 text-xs font-medium text-[var(--ink)] transition hover:border-white/20 hover:bg-white/[.06]" aria-haspopup="dialog">
      <CircleHelp size={17} className="text-[#70d6df]"/>How to get a VCF
    </button>

    <dialog ref={dialog} onClick={(event) => { if (event.target === dialog.current) close(); }} className="m-auto max-h-[min(88vh,760px)] w-[min(94vw,760px)] overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1022] p-0 text-left text-[#f7f7fb] shadow-[0_30px_100px_rgba(0,0,0,.65)] backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-[#0d1022]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
        <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#70d6df]/10 text-[#70d6df]"><CircleHelp size={20}/></span><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#70d6df]">VCF help</p><h2 className="mt-1 text-xl font-semibold">Get contacts from your phone</h2></div></div>
        <button type="button" onClick={close} aria-label="Close VCF help" className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 text-[#9ba4bb] hover:text-white"><X size={17}/></button>
      </div>

      <div className="px-5 py-6 sm:px-7">
        <div className="rounded-2xl border border-[#9b7bff]/15 bg-[#9b7bff]/[.07] p-4 text-xs leading-relaxed text-[#c7cbe0]"><b className="text-white">What is a VCF?</b> A vCard file uses the <code className="rounded bg-black/20 px-1.5 py-0.5 text-[#70d6df]">.vcf</code> extension and can contain one or many contacts. VaultSync reads it locally so you can preview the contacts before adding a backup.</div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5" role="tablist" aria-label="Choose phone platform">
          {(Object.keys(guides) as Platform[]).map((value) => { const item = guides[value]; const Icon = item.icon; const active = platform === value; return <button key={value} type="button" role="tab" aria-selected={active} onClick={() => setPlatform(value)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${active ? "bg-white/10 text-white shadow-sm" : "text-[#9ba4bb] hover:text-white"}`}><Icon size={18}/>{item.label}</button>; })}
        </div>

        <div className="mt-6 flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-2xl bg-white/[.06] ${guide.accent}`}><GuideIcon size={22}/></span><div><p className="text-[10px] uppercase tracking-[.16em] text-[#9ba4bb]">Selected guide</p><h3 className="font-semibold">{guide.label}</h3></div></div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <GuideSection icon={FileUp} title="Export from your phone" steps={guide.exportSteps}/>
          <GuideSection icon={FileDown} title="Restore to your phone" steps={guide.restoreSteps}/>
        </div>

        <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.05] p-4 text-xs leading-relaxed text-emerald-50"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={17}/><p>Your selected VCF is parsed inside this browser first. It is only uploaded after you choose <b>Add to backup</b> and start the queue.</p></div>

        <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="text-[#9ba4bb]">Phone menus may vary slightly by OS version or manufacturer.</span><div className="flex flex-wrap gap-3"><a href={guide.source} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#70d6df] hover:underline">Official export help <ExternalLink size={12}/></a><a href={guide.restoreSource} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#70d6df] hover:underline">Official import help <ExternalLink size={12}/></a></div></div>
      </div>
    </dialog>
  </>;
}

function GuideSection({ icon: Icon, title, steps }: { icon: typeof FileUp; title: string; steps: readonly string[] }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2"><Icon size={16} className="text-[#ff9188]"/><h4 className="text-sm font-semibold">{title}</h4></div><ol className="mt-4 space-y-3">{steps.map((step, index) => <li key={step} className="flex gap-3 text-xs leading-relaxed text-[#b6bdd0]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/[.07] text-[10px] text-white">{index + 1}</span><span>{step}</span></li>)}</ol></section>;
}
