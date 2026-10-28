import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const env = serverEnv();
    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);

    // OAuth cookies are host-bound. Always start the flow on the configured
    // callback origin so opening the app as 127.0.0.1 cannot lose state when
    // Google redirects back to localhost (or vice versa).
    if (request.headers.get("host") !== appUrl.host) {
      return NextResponse.redirect(new URL("/api/auth/google", appUrl));
    }

    const state = randomBytes(24).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`, response_type: "code", scope: "openid email profile https://www.googleapis.com/auth/drive.file", access_type: "offline", prompt: "consent select_account", include_granted_scopes: "true", state, code_challenge: challenge, code_challenge_method: "S256" }).toString();
    const response = NextResponse.redirect(url);
    const cookie = { httpOnly: true, secure: appUrl.protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 600 };
    response.cookies.set("vaultsync_oauth_state", state, cookie);
    response.cookies.set("vaultsync_pkce", verifier, cookie);
    return response;
  } catch (error) {
    console.error(JSON.stringify({ event: "oauth_start_failed", message: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.redirect(new URL("/settings?error=server_configuration", process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"));
  }
}
