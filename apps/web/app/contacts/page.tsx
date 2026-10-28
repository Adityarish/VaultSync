import { ContactsWorkspace } from "@/components/contacts-workspace";
import { PageHeader } from "@/components/page-header";
import { VcfHelpButton } from "@/components/vcf-help-dialog";

export const metadata = { title: "Contacts" };
export default function ContactsPage() { return <><PageHeader eyebrow="Interoperable contacts" title="Contacts" description="Import, inspect, deduplicate, and export vCard files without granting unrestricted address-book access." action={<VcfHelpButton/>}/><div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><ContactsWorkspace/></div></>; }
