import { PageHeader } from "@/components/page-header";
import { HistoryView } from "@/components/history-view";

export const metadata = { title: "Backup history" };
export default function HistoryPage() { return <><PageHeader eyebrow="Audit trail" title="Backup history" description="Only verified Drive uploads appear as recoverable items. Failed queue entries stay visible on the device for a safe retry."/><div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><HistoryView/></div></>; }
