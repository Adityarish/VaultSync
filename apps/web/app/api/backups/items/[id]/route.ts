import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabase";
import { accessTokenFor, deleteDriveFile } from "@/lib/server/google";
import { mockModeEnabled } from "@/lib/mock-data";

const idSchema = z.string().uuid();

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (mockModeEnabled()) return NextResponse.json({ error: "Demo backups cannot be deleted." }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsedId = idSchema.safeParse((await context.params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Invalid backup item" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: item, error: itemError } = await db.from("backup_items")
    .select("id,backup_job_id,drive_file_id")
    .eq("id", parsedId.data)
    .eq("user_id", session.user_id)
    .maybeSingle();
  if (itemError) return NextResponse.json({ error: "Could not open this backup item" }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Backup item not found" }, { status: 404 });

  const { data: otherReferences, error: referenceError } = await db.from("backup_items")
    .select("id")
    .eq("user_id", session.user_id)
    .eq("drive_file_id", item.drive_file_id)
    .neq("id", item.id)
    .limit(1);
  if (referenceError) return NextResponse.json({ error: "Could not verify file references" }, { status: 500 });

  if (!otherReferences?.length) {
    const account = session.connected_accounts[0];
    if (!account) return NextResponse.json({ error: "Google Drive is not connected" }, { status: 409 });
    try {
      await deleteDriveFile(await accessTokenFor(account), item.drive_file_id);
    } catch (error) {
      console.error(JSON.stringify({ event: "drive_delete_failed", itemId: item.id, message: error instanceof Error ? error.message : "Unknown error" }));
      return NextResponse.json({ error: "The file could not be deleted from Google Drive. Nothing was removed from VaultSync." }, { status: 502 });
    }
  }

  const { error: deleteError } = await db.from("backup_items").delete().eq("id", item.id).eq("user_id", session.user_id);
  if (deleteError) return NextResponse.json({ error: "The Drive file was removed, but its VaultSync record still needs cleanup. Retry delete." }, { status: 500 });

  const { data: remaining } = await db.from("backup_items").select("size_bytes,state").eq("backup_job_id", item.backup_job_id).eq("user_id", session.user_id);
  await db.from("backup_jobs").update({
    uploaded_files: remaining?.filter((entry) => entry.state === "verified").length ?? 0,
    uploaded_bytes: remaining?.reduce((sum, entry) => sum + Number(entry.size_bytes), 0) ?? 0,
    updated_at: new Date().toISOString(),
  }).eq("id", item.backup_job_id).eq("user_id", session.user_id);

  return NextResponse.json({ ok: true });
}
