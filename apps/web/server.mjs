import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";

// The repository keeps shared credentials in the root .env.local, while this
// Next.js app lives in apps/web. Load the root env before Next initializes.
const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appDir, "../..");
const dev = process.env.NODE_ENV !== "production" && process.env.npm_lifecycle_event !== "start";
process.env.NODE_ENV ??= dev ? "development" : "production";
// Do not call @next/env before Next starts: it snapshots process.env and later
// removes Next's development-server flag when it reloads the environment.
// Node's loader preserves existing variables without resetting framework state.
for (const name of [`.env.${process.env.NODE_ENV}.local`, ".env.local", `.env.${process.env.NODE_ENV}`, ".env"]) {
  try { process.loadEnvFile(resolve(repoRoot, name)); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

const portArgument = process.argv.find((argument) => argument.startsWith("--port="));
const port = Number(portArgument?.slice("--port=".length) ?? process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be a valid TCP port.");
const app = next({ dev, dir: appDir, hostname: "127.0.0.1", port, webpack: true });

await app.prepare();

const handleRequest = app.getRequestHandler();
const handleUpgrade = app.getUpgradeHandler();
const servers = [];

async function listen(host) {
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error) => {
      console.error("Request failed:", error);
      if (!response.headersSent) response.writeHead(500);
      response.end("VaultSync could not complete this request.");
    });
  });
  server.on("upgrade", handleUpgrade);
  servers.push(server);

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

try {
  await listen("127.0.0.1");
  console.log(`✓ VaultSync ready at http://127.0.0.1:${port}`);
} catch (error) {
  for (const server of servers) server.close();
  throw error;
}

async function shutdown() {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  await app.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
