import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { default: "VaultSync", template: "%s · VaultSync" },
  description: "Private, recoverable backups to your own Google Drive.",
  applicationName: "VaultSync",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "VaultSync" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#090b18", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><Script id="vaultsync-theme" strategy="beforeInteractive">{"try{document.documentElement.dataset.theme=localStorage.getItem('vaultsync-theme')||'dark'}catch(e){}"}</Script></head>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
