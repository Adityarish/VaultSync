import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";
import { fetchWithTimeout } from "./fetch-with-timeout";

export function supabaseAdmin() {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetchWithTimeout(input, init, 12_000),
      headers: { "X-Client-Info": "vaultsync-server" },
    },
  });
}
