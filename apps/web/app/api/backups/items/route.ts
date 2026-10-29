import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionIdentity } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabase";

const inputSchema = z.object({
  backupId: z.string().uuid(), localId: z.string().uuid(), driveFileId: z.string().min(1), name: z.string().min(1).max(512), relativePath: z.string().max(2048), size: z.number().int().nonnegative(), mimeType: z.string().max(255), lastModified: z.number().int().nonnegative(), category: z.enum(["photos", "videos", "contacts", "documents", "audio", "downloads", "apks", "app-inventory", "other"]), checksum: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const session = await getSessionIdentity();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid backup metadata", code: "invalid_metadata", requestId, details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const db = supabaseAdmin();
  try {
    const { error: jobError } = await db.from("backup_jobs").upsert({ id: input.backupId, user_id: session.user_id, device_id: session.device_id, kind: "manual", status: "running", started_at: new Date().toISOString() }, { onConflict: "id", ignoreDuplicates: true });
    if (jobError) return databaseError("backup_job_write_failed", "Could not create backup job", requestId, jobError);

    const item = { backup_job_id: input.backupId, user_id: session.user_id, device_id: session.device_id, client_item_id: input.localId, category: input.category, original_filename: input.name, original_relative_path: input.relativePath, size_bytes: input.size, mime_type: input.mimeType, last_modified_ms: input.lastModified, checksum_sha256: input.checksum, drive_file_id: input.driveFileId, state: "verified", verified_at: new Date().toISOString(), restore_compatibility: "browser" };
    const { error: itemError } = await db.from("backup_items").upsert(item, { onConflict: "backup_job_id,client_item_id" });
    if (itemError) {
      // A response can be lost after Supabase committed the row. A later retry
      // may carry the same Drive file under a rebuilt local queue identifier.
      // Treat that exact user/job/Drive tuple as already committed.
      if (itemError.code === "23505") {
        const { data: existing } = await db.from("backup_items").select("id").eq("user_id", session.user_id).eq("backup_job_id", input.backupId).eq("drive_file_id", input.driveFileId).maybeSingle();
        if (!existing) return databaseError("backup_item_write_failed", "Could not commit backup metadata", requestId, itemError);
      } else {
        return databaseError("backup_item_write_failed", "Could not commit backup metadata", requestId, itemError);
      }
    }
  } catch (error) {
    return databaseError("metadata_service_unavailable", "Metadata service temporarily unavailable", requestId, error);
  }
  const { data: counts } = await db.from("backup_items").select("size_bytes,state").eq("backup_job_id", input.backupId).eq("user_id", session.user_id);
  await db.from("backup_jobs").update({ uploaded_files: counts?.filter((item) => item.state === "verified").length ?? 0, uploaded_bytes: counts?.reduce((sum, item) => sum + Number(item.size_bytes), 0) ?? 0, updated_at: new Date().toISOString() }).eq("id", input.backupId).eq("user_id", session.user_id);
  return NextResponse.json({ ok: true, requestId });
}

function databaseError(code: string, publicMessage: string, requestId: string, error: unknown) {
  const details = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  console.error(JSON.stringify({ event: "backup_metadata_commit_failed", requestId, stage: code, databaseCode: typeof details.code === "string" ? details.code : undefined, message: typeof details.message === "string" ? details.message : error instanceof Error ? error.message : "unknown" }));
  return NextResponse.json({ error: publicMessage, code, requestId }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const session = await getSessionIdentity();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const checksum = request.nextUrl.searchParams.get("checksum") ?? "";
  if (!/^[a-f0-9]{64}$/.test(checksum)) return NextResponse.json({ error: "Invalid checksum" }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("backup_items").select("id").eq("user_id", session.user_id).eq("checksum_sha256", checksum).eq("state", "verified").limit(1);
  if (error) return NextResponse.json({ error: "Could not check existing backups" }, { status: 500 });
  return NextResponse.json({ duplicate: Boolean(data?.length) });
}
