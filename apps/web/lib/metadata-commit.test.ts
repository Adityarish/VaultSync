import { describe, expect, it, vi } from "vitest";
import { commitBackupMetadata, type BackupMetadataPayload } from "./metadata-commit";

const payload: BackupMetadataPayload = {
  backupId: "10000000-0000-4000-8000-000000000000",
  localId: "20000000-0000-4000-8000-000000000000",
  driveFileId: "drive-file-id",
  name: "photo.jpg",
  relativePath: "photo.jpg",
  size: 12,
  mimeType: "image/jpeg",
  lastModified: 1,
  category: "photos",
  checksum: "a".repeat(64),
};

describe("commitBackupMetadata", () => {
  it("retries a transient server failure without changing the payload", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Temporary failure" }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const waiter = vi.fn().mockResolvedValue(undefined);

    await commitBackupMetadata(payload, { fetcher, waiter });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(waiter).toHaveBeenCalledWith(400);
    expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string)).toEqual(payload);
  });

  it("does not retry invalid metadata", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Invalid backup metadata" }), { status: 400 }));
    const waiter = vi.fn().mockResolvedValue(undefined);

    await expect(commitBackupMetadata(payload, { fetcher, waiter })).rejects.toThrow("Invalid backup metadata");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(waiter).not.toHaveBeenCalled();
  });

  it("includes the server reference after retry exhaustion", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Commit failed", requestId: "request-123" }), { status: 500 }));

    await expect(commitBackupMetadata(payload, { fetcher, waiter: async () => undefined })).rejects.toThrow("Reference: request-123");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
