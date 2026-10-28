"use client";

import Dexie, { type EntityTable } from "dexie";
import type { BackupRun, LocalFileRecord, QueueItem } from "./types";

class VaultSyncDatabase extends Dexie {
  files!: EntityTable<LocalFileRecord, "id">;
  queue!: EntityTable<QueueItem, "id">;
  runs!: EntityTable<BackupRun, "id">;

  constructor() {
    super("vaultsync-local-v1");
    this.version(1).stores({
      files: "id, category, checksum, driveFileId, addedAt, verifiedAt, [name+size+lastModified]",
      queue: "id, localFileId, state, backupId, createdAt, updatedAt",
      runs: "id, state, createdAt, completedAt",
    });
  }
}

export const localDb = new VaultSyncDatabase();
