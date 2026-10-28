import { describe, expect, it } from "vitest";
import { backupManifestItemSchema } from "./index";

describe("backup manifest schema", () => {
  it("accepts a verified, restorable manifest item", () => {
    const result = backupManifestItemSchema.safeParse({ schemaVersion: 1, backupId: "e67ef2dd-653c-43e7-906a-ec4db0bd2cc4", deviceId: "c90fd6ca-72c4-4204-badb-0bdb9f4012a7", createdAt: "2026-10-28T12:00:00.000Z", category: "documents", originalFilename: "notes.txt", originalRelativePath: "Documents/notes.txt", size: 5, mimeType: "text/plain", lastModified: 1, checksumSha256: "a".repeat(64), driveFileId: "drive-id", state: "verified", encrypted: false, restoreCompatibility: "browser" });
    expect(result.success).toBe(true);
  });

  it("rejects an item that claims verification without a valid checksum", () => {
    const result = backupManifestItemSchema.safeParse({ schemaVersion: 1, backupId: crypto.randomUUID(), deviceId: crypto.randomUUID(), createdAt: new Date().toISOString(), category: "other", originalFilename: "x", originalRelativePath: "x", size: 1, mimeType: "application/octet-stream", lastModified: 1, checksumSha256: "not-a-checksum", driveFileId: "id", state: "verified", encrypted: false, restoreCompatibility: "download-only" });
    expect(result.success).toBe(false);
  });
});
