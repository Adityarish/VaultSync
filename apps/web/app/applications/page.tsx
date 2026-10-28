import { PageHeader } from "@/components/page-header";
import { ApplicationBackupsView } from "@/components/application-backups-view";

export const metadata = { title: "Applications" };
export default function ApplicationsPage() { return <><PageHeader eyebrow="Supported app recovery" title="Application backups" description="List verified packages, inspect Android inventory snapshots, and queue application recovery files."/><div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><ApplicationBackupsView/></div></>; }
