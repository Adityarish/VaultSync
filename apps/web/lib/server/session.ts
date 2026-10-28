import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import { serverEnv } from "./env";

const COOKIE = "vaultsync_session";
const SESSION_DAYS = 30;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, deviceId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const { error } = await supabaseAdmin().from("auth_sessions").insert({ user_id: userId, device_id: deviceId, token_hash: hash(token), expires_at: expiresAt.toISOString() });
  if (error) throw error;
  return {
    name: COOKIE,
    value: token,
    options: { httpOnly: true, secure: new URL(serverEnv().NEXT_PUBLIC_APP_URL).protocol === "https:", sameSite: "lax" as const, path: "/", expires: expiresAt },
  };
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = supabaseAdmin();
  const { data, error } = await db.from("auth_sessions").select("id,user_id,device_id,expires_at").eq("token_hash", hash(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error || !data) return null;
  const [{ data: user }, { data: accounts }] = await Promise.all([
    db.from("users").select("id,email,name,avatar_url").eq("id", data.user_id).single(),
    db.from("connected_accounts").select("id,access_token_ciphertext,refresh_token_ciphertext,token_expires_at,root_folder_id,provider_email").eq("user_id", data.user_id).eq("provider", "google"),
  ]);
  if (!user) return null;
  return { ...data, users: user, connected_accounts: accounts ?? [] } as unknown as { id: string; user_id: string; device_id: string; expires_at: string; users: { id: string; email: string; name: string | null; avatar_url: string | null }; connected_accounts: Array<{ id: string; access_token_ciphertext: string | null; refresh_token_ciphertext: string; token_expires_at: string | null; root_folder_id: string | null; provider_email: string }> };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await supabaseAdmin().from("auth_sessions").delete().eq("token_hash", hash(token));
  store.delete(COOKIE);
}
