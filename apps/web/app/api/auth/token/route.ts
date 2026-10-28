import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { ensureDestination } from "@/lib/server/google";

export async function POST(request: NextRequest) {
  const session = await getSession();
  const account = session?.connected_accounts[0];
  if (!session || !account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const category = request.nextUrl.searchParams.get("category") ?? "other";
    const destination = await ensureDestination(account, session.device_id, category);
    return NextResponse.json({ accessToken: destination.token, expiresAt: Date.now() + 3_300_000, rootFolderId: destination.destinationFolderId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Drive connection failed" }, { status: 502 });
  }
}
