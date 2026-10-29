import { resolve } from "node:path";

for (const name of [".env.production.local", ".env.local", ".env.production", ".env"]) {
  try { process.loadEnvFile(resolve(process.cwd(), name)); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

const required = [
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SESSION_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const errors = [];
for (const name of required) if (!process.env[name]?.trim()) errors.push(`${name} is missing.`);

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (appUrl) {
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "https:") errors.push("NEXT_PUBLIC_APP_URL must use https for Vercel.");
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) errors.push("NEXT_PUBLIC_APP_URL must contain only the deployment origin.");
    if (appUrl.endsWith("/")) errors.push("NEXT_PUBLIC_APP_URL must not have a trailing slash.");
  } catch { errors.push("NEXT_PUBLIC_APP_URL is not a valid URL."); }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try { if (new URL(supabaseUrl).protocol !== "https:") errors.push("NEXT_PUBLIC_SUPABASE_URL must use https."); }
  catch { errors.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL."); }
}

if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) errors.push("SESSION_SECRET must contain at least 32 characters.");
if (process.env.TOKEN_ENCRYPTION_KEY) {
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) errors.push("TOKEN_ENCRYPTION_KEY must be base64 for exactly 32 bytes.");
}
if (/^true$/i.test(process.env.MOCK_DATA ?? process.env.mock_data ?? "")) errors.push("MOCK_DATA must be false or unset in production.");

if (errors.length) {
  console.error("Vercel readiness check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Vercel readiness check passed. All required variables are present and structurally valid.");
  console.log(`Configure Google OAuth callback: ${appUrl}/api/auth/google/callback`);
}
