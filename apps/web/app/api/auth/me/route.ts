import { NextResponse } from "next/server";
import { isServerConfigured } from "@/lib/server/env";
import { getSession } from "@/lib/server/session";
import { mockModeEnabled } from "@/lib/mock-data";

export async function GET() {
  if (mockModeEnabled()) return NextResponse.json({ authenticated: true, configured: true, mockData: true, user: { name: "Aditya", email: "aditya.demo@vaultsync.local", avatarUrl: null }, drive: { connected: true, rootFolderId: "mock-vaultsync-root" }, deviceId: "30000000-0000-4000-8000-000000000001" });
  if (!isServerConfigured()) return NextResponse.json({ authenticated: false, configured: false });
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false, configured: true });
  const account = session.connected_accounts[0];
  return NextResponse.json({ authenticated: true, configured: true, user: { name: session.users.name, email: session.users.email, avatarUrl: session.users.avatar_url }, drive: { connected: Boolean(account), rootFolderId: account?.root_folder_id ?? null }, deviceId: session.device_id });
}
