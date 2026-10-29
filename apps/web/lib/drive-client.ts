"use client";

import { z } from "zod";
import type { RemoteBackupItem } from "./remote-backups";

const tokenSchema = z.object({ accessToken: z.string(), expiresAt: z.number() });
let cachedToken: { accessToken: string; expiresAt: number } | undefined;

async function driveToken(category: string, forceRefresh = false) {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken;
  const response = await fetch(`/api/auth/token?category=${encodeURIComponent(category)}`, { method: "POST", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "Reconnect Google Drive to access this file." : "Could not obtain temporary Drive access.");
  cachedToken = tokenSchema.parse(await response.json());
  return cachedToken.accessToken;
}

export async function fetchDriveFile(item: RemoteBackupItem, options: { signal?: AbortSignal; mockData?: boolean } = {}) {
  if (options.mockData || item.drive_file_id.startsWith("mock-drive-")) {
    const response = await fetch(`/api/drive/files/${encodeURIComponent(item.id)}/download?preview=1`, { cache: "no-store", signal: options.signal });
    if (!response.ok) throw new Error("The demo file could not be loaded.");
    return response;
  }

  const request = async (forceRefresh = false) => fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.drive_file_id)}?alt=media`,
    { headers: { Authorization: `Bearer ${await driveToken(item.category, forceRefresh)}` }, cache: "no-store", signal: options.signal },
  );
  let response = await request();
  if (response.status === 401) {
    cachedToken = undefined;
    response = await request(true);
  }
  if (!response.ok) throw new Error(`Google Drive could not return this file (${response.status}).`);
  return response;
}

export async function downloadDriveFile(item: RemoteBackupItem, mockData = false): Promise<"downloaded" | "cancelled"> {
  if (mockData || item.drive_file_id.startsWith("mock-drive-")) {
    clickDownload(`/api/drive/files/${encodeURIComponent(item.id)}/download`, item.original_filename);
    return "downloaded";
  }

  const picker = (window as typeof window & {
    showSaveFilePicker?: (options: { suggestedName: string }) => Promise<{ createWritable: () => Promise<WritableStream> }>;
  }).showSaveFilePicker;
  let handle: { createWritable: () => Promise<WritableStream> } | undefined;
  if (picker) {
    try { handle = await picker.call(window, { suggestedName: item.original_filename }); }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return "cancelled"; }
  }

  const response = await fetchDriveFile(item);
  if (handle && response.body) {
    const writable = await handle.createWritable();
    await response.body.pipeTo(writable);
    return "downloaded";
  }

  const url = URL.createObjectURL(await response.blob());
  clickDownload(url, item.original_filename);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded";
}

function clickDownload(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
