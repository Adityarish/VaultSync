export type BackupCategory = "photos" | "videos" | "contacts" | "documents" | "audio" | "downloads" | "apks" | "app-inventory" | "other";
export type QueueState = "queued" | "hashing" | "uploading" | "paused" | "failed" | "verified" | "cancelled" | "skipped";

export interface LocalFileRecord {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  type: string;
  lastModified: number;
  category: BackupCategory;
  checksum?: string;
  driveFileId?: string;
  addedAt: number;
  verifiedAt?: number;
}

export interface QueueItem {
  id: string;
  localFileId: string;
  state: QueueState;
  progress: number;
  uploadedBytes: number;
  attempts: number;
  error?: string;
  resumableUrl?: string;
  backupId: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupRun {
  id: string;
  state: "running" | "paused" | "complete" | "partial" | "cancelled";
  createdAt: number;
  completedAt?: number;
  totalFiles: number;
  totalBytes: number;
  uploadedFiles: number;
  uploadedBytes: number;
  failedFiles: number;
}
