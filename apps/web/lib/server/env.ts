import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().refine((value) => !value.endsWith("/"), "NEXT_PUBLIC_APP_URL must not have a trailing slash").default("http://127.0.0.1:3000"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().min(40),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | undefined;

function parseServerEnv(): ServerEnv {
  const parsed = schema.parse(process.env);
  if (process.env.VERCEL === "1") {
    const appUrl = new URL(parsed.NEXT_PUBLIC_APP_URL);
    const isLocalHost = appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1" || appUrl.hostname === "::1";
    if (appUrl.protocol !== "https:" || isLocalHost || appUrl.origin !== parsed.NEXT_PUBLIC_APP_URL) {
      throw new Error("NEXT_PUBLIC_APP_URL must be the exact HTTPS production origin when running on Vercel.");
    }
  }
  return parsed;
}

export function serverEnv(): ServerEnv {
  if (!cached) cached = parseServerEnv();
  return cached;
}

export function isServerConfigured(): boolean {
  try { parseServerEnv(); return true; }
  catch { return false; }
}
