import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VaultSync — Your Phone, Your Drive",
    short_name: "VaultSync",
    description: "Back up and restore user-selected data to your own Google Drive.",
    start_url: "/",
    display: "standalone",
    background_color: "#070916",
    theme_color: "#090b18",
    orientation: "any",
    categories: ["utilities", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
