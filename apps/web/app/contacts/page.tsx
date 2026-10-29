import { ContactsWorkspace } from "@/components/contacts-workspace";
import { LibraryView } from "@/components/library-view";
import { PageHeader } from "@/components/page-header";
import { VcfHelpButton } from "@/components/vcf-help-dialog";

export const metadata = { title: "Contacts" };
export default function ContactsPage() { return <><PageHeader eyebrow="Interoperable contacts" title="Contacts" description="Open backed-up VCF files, search every contact, inspect phone numbers, and export individual contacts to your device." action={<VcfHelpButton/>}/><div className="space-y-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><section><div className="mb-4"><p className="text-[10px] uppercase tracking-[.18em] text-[#70d6df]">Google Drive backups</p><h2 className="mt-1 text-xl font-semibold">Your VCF files</h2><p className="mt-1 text-sm text-[var(--muted)]">Open any verified contact file without leaving VaultSync.</p></div><LibraryView mode="list" categories={["contacts"]}/></section><section><div className="mb-4"><p className="text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Local tools</p><h2 className="mt-1 text-xl font-semibold">Import or prepare a VCF</h2></div><ContactsWorkspace/></section></div></>; }
