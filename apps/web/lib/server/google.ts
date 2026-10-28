import "server-only";
import { serverEnv } from "./env";
import { decryptSecret, encryptSecret } from "./secret-box";
import { supabaseAdmin } from "./supabase";
import { fetchWithTimeout } from "./fetch-with-timeout";

type Account = { id: string; access_token_ciphertext: string | null; refresh_token_ciphertext: string; token_expires_at: string | null; root_folder_id: string | null };

export async function accessTokenFor(account: Account): Promise<string> {
  if (account.access_token_ciphertext && account.token_expires_at && Date.parse(account.token_expires_at) > Date.now() + 60_000) return decryptSecret(account.access_token_ciphertext);
  const refreshToken = decryptSecret(account.refresh_token_ciphertext);
  const env = serverEnv();
  const response = await fetchWithTimeout("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: "refresh_token" }), cache: "no-store" });
  if (!response.ok) throw new Error(`Google token refresh failed (${response.status}).`);
  const tokens = await response.json() as { access_token: string; expires_in: number };
  const expires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await supabaseAdmin().from("connected_accounts").update({ access_token_ciphertext: encryptSecret(tokens.access_token), token_expires_at: expires, updated_at: new Date().toISOString() }).eq("id", account.id);
  if (error) throw error;
  return tokens.access_token;
}

async function driveJson<T>(token: string, input: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(input, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function getOrCreateFolder(token: string, name: string, parentId?: string, appKey?: string): Promise<string> {
  const escaped = name.replaceAll("'", "\\'");
  const clauses = [`mimeType = 'application/vnd.google-apps.folder'`, `name = '${escaped}'`, "trashed = false"];
  if (parentId) clauses.push(`'${parentId}' in parents`);
  if (appKey) clauses.push(`appProperties has { key='vaultsyncKey' and value='${appKey}' }`);
  const query = encodeURIComponent(clauses.join(" and "));
  const found = await driveJson<{ files: Array<{ id: string }> }>(token, `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id)&pageSize=1`);
  if (found.files[0]) return found.files[0].id;
  const created = await driveJson<{ id: string }>(token, "https://www.googleapis.com/drive/v3/files?fields=id", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}), appProperties: { vaultsyncKey: appKey ?? "folder" } }) });
  return created.id;
}

export async function ensureDestination(account: Account, deviceId: string, category: string): Promise<{ rootFolderId: string; destinationFolderId: string; token: string }> {
  const token = await accessTokenFor(account);
  const rootFolderId = account.root_folder_id ?? await getOrCreateFolder(token, "VaultSync", undefined, "root-v1");
  if (!account.root_folder_id) await supabaseAdmin().from("connected_accounts").update({ root_folder_id: rootFolderId }).eq("id", account.id);
  const devices = await getOrCreateFolder(token, "Devices", rootFolderId, "devices-v1");
  const device = await getOrCreateFolder(token, deviceId, devices, `device-${deviceId}`);
  const labels: Record<string, string> = { photos: "Photos", videos: "Videos", contacts: "Contacts", documents: "Documents", audio: "Audio", downloads: "Downloads", apks: "APKs", "app-inventory": "App-Inventory", manifests: "Manifests", other: "Backups" };
  const destinationFolderId = await getOrCreateFolder(token, labels[category] ?? "Backups", device, `category-${category}`);
  return { rootFolderId, destinationFolderId, token };
}
