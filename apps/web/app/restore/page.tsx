import { PageHeader } from "@/components/page-header";
import { LibraryView } from "@/components/library-view";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Restore center" };
export default function RestorePage() { return <><PageHeader eyebrow="Recovery" title="Restore center" description="Download verified originals from your Drive. Your browser chooses the final destination and will handle filename conflicts."/><div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><div className="mb-5 flex gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-xs leading-relaxed text-amber-100"><AlertTriangle className="shrink-0" size={18}/><p>VaultSync never silently overwrites a local file. Browser downloads use the browser’s skip, rename, keep-both, or replace controls where available.</p></div><LibraryView mode="list" categories={["photos","videos","contacts","documents","audio","downloads","apks","app-inventory","other"]}/></div></>; }
