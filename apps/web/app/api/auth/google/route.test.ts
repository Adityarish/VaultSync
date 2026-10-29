import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "test-secret",
      SESSION_SECRET: "s".repeat(32),
      TOKEN_ENCRYPTION_KEY: "k".repeat(40),
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test-service-role-key",
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("redirects directly to Google with the exact callback, PKCE, and state cookies", async () => {
    const { GET } = await import("./route");
    const { NextRequest } = await import("next/server");
    const response = await GET(new NextRequest("http://127.0.0.1:3000/api/auth/google", { headers: { host: "127.0.0.1:3000" } }));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(`${location.origin}${location.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3000/api/auth/google/callback");
    expect(location.searchParams.get("scope")).toContain("https://www.googleapis.com/auth/drive.file");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("state")).toBeTruthy();

    const cookies = response.cookies.getAll();
    expect(cookies.some((cookie) => cookie.name === "vaultsync_oauth_state")).toBe(true);
    expect(cookies.some((cookie) => cookie.name === "vaultsync_pkce")).toBe(true);
  });

  it("rejects a localhost OAuth origin in Vercel", async () => {
    process.env.VERCEL = "1";
    const { GET } = await import("./route");
    const { NextRequest } = await import("next/server");
    const response = await GET(new NextRequest("https://vaultsync-mu.vercel.app/api/auth/google", { headers: { host: "vaultsync-mu.vercel.app" } }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/settings?error=server_configuration");
  });
});
