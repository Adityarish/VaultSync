import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata = { title: "Settings" };
export default function SettingsPage() { return <><PageHeader eyebrow="Control center" title="Settings" description="Manage account access, honest scheduling preferences, appearance, and privacy boundaries."/><div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><SettingsPanel/></div></>; }
