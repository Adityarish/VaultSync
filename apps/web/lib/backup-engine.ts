"use client";

import { localDb } from "./local-db";
import { deleteFileBlob, getFileBlob, saveFileBlob } from "./file-vault";
import { categoryForFile, fileIdentity, sha256 } from "./file-utils";
import { runInParallel } from "./parallel";
import type { BackupCategory, BackupRun, LocalFileRecord, QueueItem } from "./types";
import { uploadToDrive } from "./drive-upload";
import { commitBackupMetadata } from "./metadata-commit";

export const MAX_PARALLEL_UPLOADS = 3;

type Listener = () => void;
const listeners = new Set<Listener>();
let activeController: AbortController | null = null;
let pauseRequested = false;
let cancelRequested = false;
const checksumLocks = new Map<string, Promise<void>>();
const runRefreshLocks = new Map<string, Promise<void>>();
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

async function remoteDuplicate(checksum: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(`/api/backups/items?checksum=${encodeURIComponent(checksum)}`, { cache: "no-store", signal });
  if (!response.ok) return false;
  return Boolean((await response.json() as { duplicate?: boolean }).duplicate);
}

async function finalizeItem(item: QueueItem, fileRecord: LocalFileRecord, driveFileId: string, checksum: string) {
  await commitBackupMetadata({ backupId: item.backupId, localId: fileRecord.id, driveFileId, name: fileRecord.name, relativePath: fileRecord.relativePath, size: fileRecord.size, mimeType: fileRecord.type, lastModified: fileRecord.lastModified, category: fileRecord.category, checksum });
}

function throwIfStopped(signal: AbortSignal) {
  if (signal.aborted || pauseRequested || cancelRequested) throw new DOMException("Aborted", "AbortError");
}

async function withKeyLock<T>(locks: Map<string, Promise<void>>, key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  locks.set(key, tail);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (locks.get(key) === tail) locks.delete(key);
  }
}

async function processQueueItem(item: QueueItem, signal: AbortSignal) {
  try {
    const fileRecord = await localDb.files.get(item.localFileId);
    const file = await getFileBlob(item.localFileId);
    if (!fileRecord || !file) {
      await localDb.queue.update(item.id, { state: "failed", error: "The local file is no longer available. Select it again.", updatedAt: Date.now() });
      return;
    }

    await localDb.runs.update(item.backupId, { state: "running" });
    await localDb.queue.update(item.id, { state: "hashing", error: undefined, attempts: item.attempts + 1, updatedAt: Date.now() });
    notify();
    const checksum = fileRecord.checksum ?? await sha256(file);
    throwIfStopped(signal);
    await localDb.files.update(fileRecord.id, { checksum });
    await withKeyLock(checksumLocks, checksum, async () => {
      throwIfStopped(signal);
      const duplicate = await localDb.files.where("checksum").equals(checksum).and((candidate) => Boolean(candidate.verifiedAt && candidate.driveFileId && candidate.id !== fileRecord.id)).first();
      const isRemoteDuplicate = !fileRecord.driveFileId && !duplicate?.driveFileId && await remoteDuplicate(checksum, signal);
      throwIfStopped(signal);
      if (!fileRecord.driveFileId && (duplicate?.driveFileId || isRemoteDuplicate)) {
        await localDb.queue.update(item.id, { state: "skipped", error: "Duplicate skipped: this exact file is already backed up.", updatedAt: Date.now() });
        await localDb.files.delete(fileRecord.id);
        await deleteFileBlob(fileRecord.id);
        return;
      }
      if (fileRecord.driveFileId) {
        await finalizeItem(item, fileRecord, fileRecord.driveFileId, checksum);
        await localDb.files.update(fileRecord.id, { verifiedAt: Date.now() });
        await localDb.queue.update(item.id, { state: "verified", progress: 100, uploadedBytes: file.size, updatedAt: Date.now() });
      } else {
        await localDb.queue.update(item.id, { state: "uploading", updatedAt: Date.now() });
        notify();
        const result = await uploadToDrive(file, {
          category: fileRecord.category,
          existingSession: item.resumableUrl, signal,
          onSession: async (url) => { await localDb.queue.update(item.id, { resumableUrl: url, updatedAt: Date.now() }); },
          onProgress: async (uploadedBytes) => { await localDb.queue.update(item.id, { uploadedBytes, progress: Math.round(uploadedBytes / file.size * 100), updatedAt: Date.now() }); notify(); },
        });
        await localDb.files.update(fileRecord.id, { driveFileId: result.id });
        await finalizeItem(item, fileRecord, result.id, checksum);
        await localDb.files.update(fileRecord.id, { driveFileId: result.id, verifiedAt: Date.now() });
        await localDb.queue.update(item.id, { state: "verified", progress: 100, uploadedBytes: file.size, resumableUrl: undefined, updatedAt: Date.now() });
      }
      await deleteFileBlob(fileRecord.id);
    });
  } catch (error) {
    if (!cancelRequested) {
      const current = await localDb.queue.get(item.id);
      if (current?.state !== "cancelled") {
        await localDb.queue.update(item.id, {
          state: pauseRequested ? "paused" : "failed",
          error: pauseRequested ? undefined : error instanceof Error ? error.message : "Unexpected backup failure",
          updatedAt: Date.now(),
        });
      }
    }
  } finally {
    await refreshRun(item.backupId);
    notify();
  }
}

export async function startQueue(): Promise<void> {
  if (activeController) return;
  pauseRequested = false;
  cancelRequested = false;
  const controller = new AbortController();
  activeController = controller;
  try {
    const pending = await localDb.queue.where("state").anyOf("queued", "failed", "paused").sortBy("createdAt");
    await runInParallel(
      pending,
      MAX_PARALLEL_UPLOADS,
      (item) => processQueueItem(item, controller.signal),
      () => !pauseRequested && !cancelRequested,
    );
  } finally {
    if (activeController === controller) activeController = null;
    notify();
  }
}

async function refreshRun(backupId: string) {
  await withKeyLock(runRefreshLocks, backupId, () => refreshRunNow(backupId));
}

async function refreshRunNow(backupId: string) {
  const previousRun = await localDb.runs.get(backupId);
  const items = await localDb.queue.where("backupId").equals(backupId).toArray();
  const complete = items.filter((item) => item.state === "verified");
  const failed = items.filter((item) => item.state === "failed");
  const skipped = items.filter((item) => item.state === "skipped" || item.state === "cancelled");
  const done = complete.length + failed.length + skipped.length === items.length;
  const terminalState = complete.length === 0 && failed.length === 0 && skipped.length > 0 ? "cancelled" : failed.length ? "partial" : "complete";
  await localDb.runs.update(backupId, { state: done ? terminalState : pauseRequested ? "paused" : "running", completedAt: done ? Date.now() : undefined, uploadedFiles: complete.length, uploadedBytes: complete.reduce((sum, item) => sum + item.uploadedBytes, 0), failedFiles: failed.length });
  if (done && failed.length === 0 && complete.length > 0 && previousRun?.state !== "complete") {
    const finalized = await fetch(`/api/backups/${backupId}/complete`, { method: "POST" }).catch(() => null);
    if (!finalized?.ok) await localDb.runs.update(backupId, { state: "partial" });
  }
}

export function pauseQueue() { pauseRequested = true; activeController?.abort(); }

export async function cancelPending() {
  pauseRequested = false;
  cancelRequested = true;
  activeController?.abort();
  const items = await localDb.queue.where("state").anyOf("queued", "paused", "failed", "hashing", "uploading").toArray();
  await localDb.queue.bulkUpdate(items.map((item) => ({ key: item.id, changes: { state: "cancelled" as const, updatedAt: Date.now() } })));
  for (const item of items) await refreshRun(item.backupId);
  notify();
}
