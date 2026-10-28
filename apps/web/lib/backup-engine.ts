"use client";

import { localDb } from "./local-db";
import { deleteFileBlob, getFileBlob, saveFileBlob } from "./file-vault";
import { categoryForFile, fileIdentity, sha256 } from "./file-utils";
import type { BackupCategory, BackupRun, LocalFileRecord, QueueItem } from "./types";
import { uploadToDrive } from "./drive-upload";

type Listener = () => void;
const listeners = new Set<Listener>();
let activeController: AbortController | null = null;
let pauseRequested = false;
let queueVersion = 0;
const notify = () => { queueVersion += 1; listeners.forEach((listener) => listener()); };
export const subscribeQueue = (listener: Listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getQueueVersion = () => queueVersion;

export interface AddFilesResult {
  backupId: string;
  added: number;
  duplicatesSkipped: number;
}

export async function addFiles(files: File[], categoryOverride?: BackupCategory): Promise<AddFilesResult> {
  const uniqueSelection = new Map<string, File>();
  for (const file of files) if (!uniqueSelection.has(fileIdentity(file))) uniqueSelection.set(fileIdentity(file), file);

  const pendingQueue = await localDb.queue.where("state").anyOf("queued", "hashing", "uploading", "paused", "failed").toArray();
  const pendingIds = new Set(pendingQueue.map((item) => item.localFileId));
  const pendingFiles = (await localDb.files.bulkGet([...pendingIds])).filter((record): record is LocalFileRecord => Boolean(record));
  const pendingIdentities = new Set(pendingFiles.map((record) => `${record.relativePath || record.name}\u0000${record.size}\u0000${record.lastModified}`));
  const accepted = [...uniqueSelection.entries()].filter(([identity]) => !pendingIdentities.has(identity)).map(([, file]) => file);
  const duplicatesSkipped = files.length - accepted.length;
  if (accepted.length === 0) throw new Error(files.length === 1 ? "This file is already in the backup queue." : "All selected files are already in the backup queue.");

  const backupId = crypto.randomUUID();
  const now = Date.now();
  const run: BackupRun = { id: backupId, state: "paused", createdAt: now, totalFiles: accepted.length, totalBytes: accepted.reduce((sum, file) => sum + file.size, 0), uploadedFiles: 0, uploadedBytes: 0, failedFiles: 0 };
  const staged = accepted.map((file) => {
    const id = crypto.randomUUID();
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const record: LocalFileRecord = { id, name: file.name, relativePath, size: file.size, type: file.type || "application/octet-stream", lastModified: file.lastModified, category: categoryOverride ?? categoryForFile(file), addedAt: now };
    const queue: QueueItem = { id: crypto.randomUUID(), localFileId: id, state: "queued", progress: 0, uploadedBytes: 0, attempts: 0, backupId, createdAt: now, updatedAt: now };
    return { file, record, queue };
  });

  try {
    // File blobs live in a separate IndexedDB database. Persist them before
    // opening the Dexie transaction; awaiting that database from inside a
    // Dexie transaction causes PrematureCommitError.
    for (const item of staged) await saveFileBlob(item.record.id, item.file);

    await localDb.transaction("rw", localDb.files, localDb.queue, localDb.runs, async () => {
      await localDb.runs.add(run);
      await localDb.files.bulkAdd(staged.map((item) => item.record));
      await localDb.queue.bulkAdd(staged.map((item) => item.queue));
    });
  } catch (error) {
    await Promise.allSettled(staged.map((item) => deleteFileBlob(item.record.id)));
    throw error;
  }
  notify();
  return { backupId, added: accepted.length, duplicatesSkipped };
}

async function remoteDuplicate(checksum: string): Promise<boolean> {
  const response = await fetch(`/api/backups/items?checksum=${encodeURIComponent(checksum)}`, { cache: "no-store" });
  if (!response.ok) return false;
  return Boolean((await response.json() as { duplicate?: boolean }).duplicate);
}

async function finalizeItem(item: QueueItem, fileRecord: LocalFileRecord, driveFileId: string, checksum: string) {
  const response = await fetch("/api/backups/items", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backupId: item.backupId, localId: fileRecord.id, driveFileId, name: fileRecord.name, relativePath: fileRecord.relativePath, size: fileRecord.size, mimeType: fileRecord.type, lastModified: fileRecord.lastModified, category: fileRecord.category, checksum }),
  });
  if (!response.ok) throw new Error("The file reached Drive, but its recovery metadata could not be committed. Retry to finish safely.");
}

export async function startQueue(): Promise<void> {
  if (activeController) return;
  pauseRequested = false;
  activeController = new AbortController();
  try {
    const pending = await localDb.queue.where("state").anyOf("queued", "failed", "paused").sortBy("createdAt");
    for (const item of pending) {
      if (pauseRequested) break;
      const fileRecord = await localDb.files.get(item.localFileId);
      const file = await getFileBlob(item.localFileId);
      if (!fileRecord || !file) {
        await localDb.queue.update(item.id, { state: "failed", error: "The local file is no longer available. Select it again.", updatedAt: Date.now() });
        continue;
      }
      try {
        await localDb.runs.update(item.backupId, { state: "running" });
        await localDb.queue.update(item.id, { state: "hashing", error: undefined, attempts: item.attempts + 1, updatedAt: Date.now() });
        notify();
        const checksum = fileRecord.checksum ?? await sha256(file);
        await localDb.files.update(fileRecord.id, { checksum });
        const duplicate = await localDb.files.where("checksum").equals(checksum).and((candidate) => Boolean(candidate.verifiedAt && candidate.driveFileId && candidate.id !== fileRecord.id)).first();
        if (!fileRecord.driveFileId && (duplicate?.driveFileId || await remoteDuplicate(checksum))) {
          await localDb.queue.update(item.id, { state: "skipped", error: "Duplicate skipped: this exact file is already backed up.", updatedAt: Date.now() });
          await localDb.files.delete(fileRecord.id);
          await deleteFileBlob(fileRecord.id);
          await refreshRun(item.backupId);
          notify();
          continue;
        }
        if (fileRecord.driveFileId) {
          await finalizeItem(item, fileRecord, fileRecord.driveFileId, checksum);
          await localDb.files.update(fileRecord.id, { verifiedAt: Date.now() });
          await localDb.queue.update(item.id, { state: "verified", progress: 100, uploadedBytes: file.size, updatedAt: Date.now() });
        } else {
          await localDb.queue.update(item.id, { state: "uploading", updatedAt: Date.now() });
          const result = await uploadToDrive(file, {
            category: fileRecord.category,
            existingSession: item.resumableUrl, signal: activeController.signal,
            onSession: async (url) => { await localDb.queue.update(item.id, { resumableUrl: url, updatedAt: Date.now() }); },
            onProgress: async (uploadedBytes) => { await localDb.queue.update(item.id, { uploadedBytes, progress: Math.round(uploadedBytes / file.size * 100), updatedAt: Date.now() }); notify(); },
          });
          await localDb.files.update(fileRecord.id, { driveFileId: result.id });
          await finalizeItem(item, fileRecord, result.id, checksum);
          await localDb.files.update(fileRecord.id, { driveFileId: result.id, verifiedAt: Date.now() });
          await localDb.queue.update(item.id, { state: "verified", progress: 100, uploadedBytes: file.size, resumableUrl: undefined, updatedAt: Date.now() });
        }
        await deleteFileBlob(fileRecord.id);
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        await localDb.queue.update(item.id, { state: aborted && pauseRequested ? "paused" : "failed", error: aborted && pauseRequested ? undefined : error instanceof Error ? error.message : "Unexpected backup failure", updatedAt: Date.now() });
      }
      await refreshRun(item.backupId);
      notify();
    }
  } finally {
    activeController = null;
    notify();
  }
}

async function refreshRun(backupId: string) {
  const items = await localDb.queue.where("backupId").equals(backupId).toArray();
  const complete = items.filter((item) => item.state === "verified");
  const failed = items.filter((item) => item.state === "failed");
  const skipped = items.filter((item) => item.state === "skipped" || item.state === "cancelled");
  const done = complete.length + failed.length + skipped.length === items.length;
  const terminalState = complete.length === 0 && failed.length === 0 && skipped.length > 0 ? "cancelled" : failed.length ? "partial" : "complete";
  await localDb.runs.update(backupId, { state: done ? terminalState : pauseRequested ? "paused" : "running", completedAt: done ? Date.now() : undefined, uploadedFiles: complete.length, uploadedBytes: complete.reduce((sum, item) => sum + item.uploadedBytes, 0), failedFiles: failed.length });
  if (done && failed.length === 0 && items.length > 0) {
    const finalized = await fetch(`/api/backups/${backupId}/complete`, { method: "POST" }).catch(() => null);
    if (!finalized?.ok) await localDb.runs.update(backupId, { state: "partial" });
  }
}

export function pauseQueue() { pauseRequested = true; activeController?.abort(); }

export async function cancelPending() {
  pauseRequested = false;
  activeController?.abort();
  const items = await localDb.queue.where("state").anyOf("queued", "paused", "failed", "hashing", "uploading").toArray();
  await localDb.queue.bulkUpdate(items.map((item) => ({ key: item.id, changes: { state: "cancelled" as const, updatedAt: Date.now() } })));
  for (const item of items) await refreshRun(item.backupId);
  notify();
}
