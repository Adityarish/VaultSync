import type { BackupCategory } from "./types";

export function categoryForFile(file: Pick<File, "type" | "name">): BackupCategory {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (file.type.startsWith("image/")) return "photos";
  if (file.type.startsWith("video/")) return "videos";
  if (file.type.startsWith("audio/")) return "audio";
  if (ext === "vcf") return "contacts";
  if (ext === "apk" || ext === "apks" || ext === "xapk") return "apks";
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "zip", "csv"].includes(ext ?? "")) return "documents";
  return "other";
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const place = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** place).toLocaleString(undefined, { maximumFractionDigits: place > 1 ? 1 : 0 })} ${units[place]}`;
}

export async function sha256(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function fileIdentity(file: Pick<File, "name" | "size" | "lastModified"> & { webkitRelativePath?: string }): string {
  const path = file.webkitRelativePath || file.name;
  return `${path}\u0000${file.size}\u0000${file.lastModified}`;
}

export function filesFromInput(list: FileList | null): File[] { return list ? Array.from(list) : []; }
