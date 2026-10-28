import { PageHeader } from "@/components/page-header";
import { LibraryView } from "@/components/library-view";

export const metadata = { title: "Files" };
export default function FilesPage() { return <><PageHeader eyebrow="File vault" title="Documents & files" description="Search, verify, and recover user-selected documents, archives, audio, downloads, and other files without changing their original bytes."/><div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><LibraryView mode="list" categories={["documents", "audio", "downloads", "other"]}/></div></>; }
