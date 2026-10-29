import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { ensureDestination } from "@/lib/server/google";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(); const account = session?.connected_accounts[0];
  if (!session || !account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const db = supabaseAdmin();
  const { data: job } = await db.from("backup_jobs").select("id,device_id,created_at").eq("id", id).eq("user_id", session.user_id).maybeSingle();
  const { data: items } = await db.from("backup_items").select("category,original_filename,original_relative_path,size_bytes,mime_type,last_modified_ms,checksum_sha256,drive_file_id,state,encryption_metadata,restore_compatibility,verified_at").eq("backup_job_id", id).eq("user_id", session.user_id).eq("state", "verified");
  if (!job || !items?.length) return NextResponse.json({ error: "Backup is not ready to finalize" }, { status: 409 });
  const manifest = JSON.stringify({ schemaVersion: 1, backupId: id, deviceId: job.device_id, createdAt: job.created_at, completedAt: new Date().toISOString(), items: items.map((item) => ({ category: item.category, originalFilename: item.original_filename, originalRelativePath: item.original_relative_path, size: Number(item.size_bytes), mimeType: item.mime_type, lastModified: Number(item.last_modified_ms), checksumSha256: item.checksum_sha256, driveFileId: item.drive_file_id, state: item.state, encryption: item.encryption_metadata, restoreCompatibility: item.restore_compatibility })) });
  const checksum = createHash("sha256").update(manifest).digest("hex");
  try {
    const destination = await ensureDestination(account, session.device_id, "manifests");
    const boundary = `vaultsync_${crypto.randomUUID()}`;
    const metadata = JSON.stringify({ name: `manifest-${id}.json`, parents: [destination.destinationFolderId], mimeType: "application/json", appProperties: { vaultsyncBackupId: id, schemaVersion: "1" } });
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${manifest}\r\n--${boundary}--`;
    const upload = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { Authorization: `Bearer ${destination.token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
    if (!upload.ok) throw new Error(`Manifest upload failed (${upload.status})`);
    const driveManifest = await upload.json() as { id: string };
    const totalBytes = items.reduce((sum, item) => sum + Number(item.size_bytes), 0);
    const { error } = await db.rpc("finalize_backup", { p_backup_id: id, p_user_id: session.user_id, p_manifest_drive_id: driveManifest.id, p_manifest_checksum: checksum, p_item_count: items.length, p_size_bytes: totalBytes });
    if (error) throw error;
    return NextResponse.json({ ok: true, manifestDriveId: driveManifest.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup finalization failed" }, { status: 502 });
  }
}
