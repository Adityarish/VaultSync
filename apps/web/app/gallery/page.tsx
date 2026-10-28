import { PageHeader } from "@/components/page-header";
import { LibraryView } from "@/components/library-view";

export const metadata = { title: "Photos & videos" };
export default function GalleryPage() { return <><PageHeader eyebrow="Media library" title="Photos & videos" description="Browse the original media files that reached your Drive and have recovery metadata. VaultSync never sends originals to a thumbnail service."/><div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><LibraryView categories={["photos", "videos"]}/></div></>; }
