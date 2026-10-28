"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArchiveRestore, Boxes, Clock3, ContactRound, FileText, GalleryHorizontalEnd, HardDrive, Home, Laptop, Settings, WifiOff } from "lucide-react";
import { Logo } from "./logo";
import { ConnectionBadge } from "./connection-badge";

const desktop = [
  ["/", "Overview", Home], ["/gallery", "Photos & videos", GalleryHorizontalEnd], ["/contacts", "Contacts", ContactRound],
  ["/files", "Documents", FileText], ["/applications", "Applications", Boxes], ["/history", "Backup history", Clock3],
  ["/restore", "Restore center", ArchiveRestore], ["/devices", "Connected devices", Laptop], ["/settings", "Settings", Settings],
] as const;
const mobile = [["/", "Home", Home], ["/gallery", "Gallery", GalleryHorizontalEnd], ["/files", "Files", HardDrive], ["/restore", "Restore", ArchiveRestore], ["/settings", "Settings", Settings]] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => href === "/" ? path === "/" : path.startsWith(href);
  return (
    <div className="mx-auto min-h-screen max-w-[1600px] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="px-2"><Logo /></div>
        <nav className="mt-10 space-y-1" aria-label="Primary navigation">
          {desktop.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${isActive(href) ? "bg-white/[.075] text-white shadow-[inset_3px_0_0_#ff7d78]" : "text-[var(--muted)] hover:bg-white/[.04] hover:text-[var(--ink)]"}`}>
              <Icon size={17} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <ConnectionBadge />
          <div className="rounded-xl border border-[var(--line)] p-3 text-[11px] leading-relaxed text-[var(--muted)]"><WifiOff size={14} className="mb-2" />Offline actions stay on this device until a verified cloud sync completes.</div>
        </div>
      </aside>
      <main className="min-w-0 pb-28 lg:col-start-2 lg:pb-8">{children}</main>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[24px] border border-white/10 bg-[#12152b]/95 p-2 shadow-2xl backdrop-blur-2xl lg:hidden" aria-label="Mobile navigation">
        {mobile.map(([href, label, Icon]) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] ${isActive(href) ? "bg-white/10 text-[#ff8a82]" : "text-[#929ab2]"}`}><Icon size={19}/><span>{label}</span></Link>)}
      </nav>
    </div>
  );
}
