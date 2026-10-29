import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabase";
import { accessTokenFor } from "@/lib/server/google";
import { MOCK_APPLICATION_INVENTORY, MOCK_BACKUP_ITEMS, mockModeEnabled } from "@/lib/mock-data";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const preview = request.nextUrl.searchParams.get("preview") === "1";
  if (mockModeEnabled()) {
    const mock = MOCK_BACKUP_ITEMS.find((item) => item.id === id);
    if (!mock) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (mock.category === "app-inventory") {
      return NextResponse.json(MOCK_APPLICATION_INVENTORY, { headers: { "Content-Disposition": `attachment; filename="${mock.original_filename}"`, "Cache-Control": "no-store" } });
    }
    const safeMockName = mock.original_filename.replace(/["\r\n]/g, "_");
    if (preview && mock.category === "contacts") {
      const mockContacts = [
        "BEGIN:VCARD", "VERSION:3.0", "FN:Aarav Sharma", "TEL;TYPE=CELL:+91 98765 43210", "EMAIL:aarav@example.com", "END:VCARD",
        "BEGIN:VCARD", "VERSION:3.0", "FN:Meera Iyer", "TEL;TYPE=CELL:+91 99887 76655", "TEL;TYPE=HOME:+91 80 2345 6789", "EMAIL:meera@example.com", "END:VCARD",
        "BEGIN:VCARD", "VERSION:3.0", "FN:Kabir Singh", "TEL;TYPE=CELL:+91 91234 56789", "ADR:;;Sector 17;Chandigarh;;;India", "END:VCARD",
      ].join("\r\n");
      return new NextResponse(mockContacts, { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `inline; filename="${safeMockName}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const mockBody = `VaultSync UI preview file\n\n${mock.original_filename}\nThis is mock data and not a real backup.\n`;
    const mockMime = preview ? mock.mime_type || "text/plain; charset=utf-8" : "text/plain; charset=utf-8";
    const mockName = preview ? safeMockName : `DEMO-${safeMockName}.txt`;
    const mockHeaders = { "Content-Type": mockMime, "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${mockName}"`, "Cache-Control": "no-store" };
    if (preview && mock.category === "app-inventory") return NextResponse.json(MOCK_APPLICATION_INVENTORY, { headers: { ...mockHeaders, "Content-Type": "application/json" } });
    return new NextResponse(mockBody, { headers: mockHeaders });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: item } = await supabaseAdmin().from("backup_items").select("drive_file_id,original_filename,mime_type").eq("id", id).eq("user_id", session.user_id).eq("state", "verified").maybeSingle();
  const account = session.connected_accounts[0];
  if (!item || !account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const token = await accessTokenFor(account);
  const range = request.headers.get("range");
  const drive = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.drive_file_id)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}`, ...(range ? { Range: range } : {}) },
    cache: "no-store",
  });
  if (!drive.ok || !drive.body) return NextResponse.json({ error: "Drive download failed" }, { status: 502 });
  const safeName = String(item.original_filename).replace(/["\r\n]/g, "_");
  const headers = new Headers({
    "Content-Type": item.mime_type || "application/octet-stream",
    "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${safeName}"`,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": drive.headers.get("accept-ranges") ?? "bytes",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-range", "content-length"]) {
    const value = drive.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(drive.body, { status: drive.status, headers });
}
