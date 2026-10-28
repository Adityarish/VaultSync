import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/server/env";
import { encryptSecret } from "@/lib/server/secret-box";
import { supabaseAdmin } from "@/lib/server/supabase";
import { createSession } from "@/lib/server/session";
import { fetchWithTimeout } from "@/lib/server/fetch-with-timeout";

export const runtime = "nodejs";
const tokenSchema = z.object({ access_token: z.string(), expires_in: z.number(), refresh_token: z.string().optional() });
const profileSchema = z.object({ sub: z.string(), email: z.string().email(), name: z.string().optional(), picture: z.string().url().optional() });

export async function GET(request: NextRequest) {
  let home = new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000");
  try {
    const env = serverEnv();
    home = new URL("/", env.NEXT_PUBLIC_APP_URL);
    const settings = new URL("/settings", home);
    const store = await cookies();
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!state || state !== store.get("vaultsync_oauth_state")?.value) {
      return oauthRedirect(new URL("/settings?error=oauth_state", home));
    }
    const providerError = request.nextUrl.searchParams.get("error");
    if (providerError) {
      return oauthRedirect(new URL(`/settings?error=${providerError === "access_denied" ? "google_access_denied" : "google_oauth"}`, home), true);
    }
    if (!code) return oauthRedirect(new URL("/settings?error=google_oauth", home), true);
    const verifier = store.get("vaultsync_pkce")?.value;
    if (!verifier) return oauthRedirect(new URL("/settings?error=oauth_expired", home), true);

    const tokenResponse = await fetchWithTimeout("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`, grant_type: "authorization_code", code_verifier: verifier }), cache: "no-store" });
    if (!tokenResponse.ok) throw new Error("oauth_token_exchange");
    const tokens = tokenSchema.parse(await tokenResponse.json());
    const profileResponse = await fetchWithTimeout("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    if (!profileResponse.ok) throw new Error("oauth_profile_failed");
    const profile = profileSchema.parse(await profileResponse.json());
    const db = supabaseAdmin();
    const { data: existing, error: existingError } = await db.from("connected_accounts").select("id,user_id,refresh_token_ciphertext").eq("provider", "google").eq("provider_subject", profile.sub).maybeSingle();
    if (existingError) throw existingError;
    let userId = existing?.user_id as string | undefined;
    if (!userId) {
      const { data: knownUser, error: knownUserError } = await db.from("users").select("id").ilike("email", profile.email).maybeSingle();
      if (knownUserError) throw knownUserError;
      if (knownUser) userId = knownUser.id as string;
      else {
        const { data: user, error } = await db.from("users").insert({ email: profile.email, name: profile.name ?? null, avatar_url: profile.picture ?? null }).select("id").single();
        if (error) throw error;
        userId = user.id as string;
      }
    } else {
      const { error } = await db.from("users").update({ email: profile.email, name: profile.name ?? null, avatar_url: profile.picture ?? null, updated_at: new Date().toISOString() }).eq("id", userId);
      if (error) throw error;
    }
    const refreshCiphertext = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : existing?.refresh_token_ciphertext;
    if (!refreshCiphertext) throw new Error("Google did not return a refresh token. Revoke VaultSync access and reconnect.");
    const account = { user_id: userId, provider: "google", provider_subject: profile.sub, provider_email: profile.email, access_token_ciphertext: encryptSecret(tokens.access_token), refresh_token_ciphertext: refreshCiphertext, token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file"], updated_at: new Date().toISOString() };
    if (existing?.id) { const { error } = await db.from("connected_accounts").update(account).eq("id", existing.id); if (error) throw error; }
    else { const { error } = await db.from("connected_accounts").insert(account); if (error) throw error; }
    const deviceResult = await db.from("devices").select("id").eq("user_id", userId).eq("fingerprint", "web-primary").maybeSingle();
    if (deviceResult.error) throw deviceResult.error;
    let device = deviceResult.data;
    if (!device) { const result = await db.from("devices").insert({ user_id: userId, friendly_name: "Web browser", device_type: "browser", platform: "web", fingerprint: "web-primary", capabilities: ["file-picker", "directory-picker"] }).select("id").single(); if (result.error) throw result.error; device = result.data; }
    const sessionCookie = await createSession(userId, device.id as string);
    settings.searchParams.set("connected", "1");
    const response = oauthRedirect(settings, true);
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    return response;
  } catch (error) {
    const message = errorMessage(error);
    console.error(JSON.stringify({ event: "oauth_callback_failed", message: message || "unknown" }));
    const databaseFailure = /PGRST|42P01|schema cache|relation .* does not exist|Could not find the table/i.test(message);
    const serviceFailure = /fetch failed|timed out|timeout|ENOTFOUND|ECONN/i.test(message);
    const code = databaseFailure ? "database_setup" : serviceFailure ? "service_unavailable" : message.startsWith("oauth_") ? message : "oauth_callback";
    return oauthRedirect(new URL(`/settings?error=${code}`, home), true);
  }
}

function oauthRedirect(url: URL, clearTemporaryCookies = false) {
  const response = NextResponse.redirect(url);
  if (clearTemporaryCookies) {
    response.cookies.delete("vaultsync_oauth_state");
    response.cookies.delete("vaultsync_pkce");
  }
  return response;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "";
}
