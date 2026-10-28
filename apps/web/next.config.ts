import type { NextConfig } from "next";
import { resolve } from "node:path";

// The web app lives in a workspace, while local credentials live at the
// repository root. Load that root environment before evaluating server code.
for (const name of [`.env.${process.env.NODE_ENV}.local`, ".env.local", `.env.${process.env.NODE_ENV}`, ".env"]) {
  try { process.loadEnvFile(resolve(__dirname, "../..", name)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    typedEnv: true,
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      ],
    },
  ],
};

export default nextConfig;
