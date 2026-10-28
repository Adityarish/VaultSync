import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabase";
import { accessTokenFor } from "@/lib/server/google";
import { MOCK_APPLICATION_INVENTORY, MOCK_BACKUP_ITEMS, mockModeEnabled } from "@/lib/mock-data";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (mockModeEnabled()) {
    const mock = MOCK_BACKUP_ITEMS.find((item) => item.id === id);
    if (!mock) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (mock.category === "app-inventory") {
      return NextResponse.json(MOCK_APPLICATION_INVENTORY, { headers: { "Content-Disposition": `attachment; filename="${mock.original_filename}"`, "Cache-Control": "no-store" } });
    }
    return new NextResponse(`VaultSync UI preview file\n\n${mock.original_filename}\nThis is mock data and not a real backup.\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="DEMO-${mock.original_filename}.txt"`, "Cache-Control": "no-store" } });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: item } = await supabaseAdmin().from("backup_items").select("drive_file_id,original_filename,mime_type").eq("id", id).eq("user_id", session.user_id).eq("state", "verified").maybeSingle();
  const account = session.connected_accounts[0];
  if (!item || !account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const token = await accessTokenFor(account);
  const drive = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.drive_file_id)}?alt=media`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!drive.ok || !drive.body) return NextResponse.json({ error: "Drive download failed" }, { status: 502 });
  const safeName = String(item.original_filename).replace(/["\r\n]/g, "_");
  return new NextResponse(drive.body, { headers: { "Content-Type": item.mime_type || "application/octet-stream", "Content-Disposition": `attachment; filename="${safeName}"`, "Cache-Control": "private, no-store" } });
}
