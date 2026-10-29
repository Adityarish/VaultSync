import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabase";
import { MOCK_BACKUP_ITEMS, mockModeEnabled } from "@/lib/mock-data";

export async function GET() {
  if (mockModeEnabled()) return NextResponse.json({ items: MOCK_BACKUP_ITEMS, mockData: true });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("backup_items").select("id,backup_job_id,category,original_filename,original_relative_path,size_bytes,mime_type,last_modified_ms,checksum_sha256,drive_file_id,verified_at,restore_compatibility").eq("user_id", session.user_id).order("verified_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: "Could not load backups" }, { status: 500 });
  return NextResponse.json({ items: data });
}
