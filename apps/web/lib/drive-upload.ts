import { z } from "zod";

const tokenSchema = z.object({ accessToken: z.string(), expiresAt: z.number(), rootFolderId: z.string() });

async function fetchWithBackoff(input: RequestInfo | URL, init: RequestInit, attempts = 4): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === attempts - 1) return response;
      lastError = new Error(`Transient Drive error (${response.status}).`);
    } catch (error) {
      if (init.signal?.aborted || attempt === attempts - 1) throw error;
      lastError = error;
    }
    const delay = Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 350);
    await new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, delay); init.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true }); });
  }
  throw lastError instanceof Error ? lastError : new Error("Drive request failed after retries.");
}

async function getUploadToken(category: string) {
  const response = await fetch(`/api/auth/token?category=${encodeURIComponent(category)}`, { method: "POST" });
  if (!response.ok) throw new Error(response.status === 401 ? "Connect Google Drive before starting a backup." : "Could not obtain a Drive upload token.");
  return tokenSchema.parse(await response.json());
}

export async function uploadToDrive(file: File, options: {
  category: string;
  existingSession?: string;
  signal: AbortSignal;
  onSession: (url: string) => Promise<void>;
  onProgress: (uploaded: number) => Promise<void>;
}): Promise<{ id: string; md5Checksum?: string }> {
  const auth = await getUploadToken(options.category);
  let session = options.existingSession;
  if (!session) {
    const init = await fetchWithBackoff("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,md5Checksum,size", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": file.type || "application/octet-stream", "X-Upload-Content-Length": String(file.size) },
      body: JSON.stringify({ name: file.name, parents: [auth.rootFolderId], appProperties: { source: "vaultsync", originalLastModified: String(file.lastModified) } }),
      signal: options.signal,
    });
    if (!init.ok) throw new Error(`Drive rejected the upload session (${init.status}).`);
    session = init.headers.get("Location") ?? undefined;
    if (!session) throw new Error("Drive did not return a resumable upload location.");
    await options.onSession(session);
  }

  const chunkSize = 8 * 1024 * 1024;
  let offset = 0;
  if (options.existingSession) {
    const status = await fetchWithBackoff(session, { method: "PUT", headers: { "Content-Length": "0", "Content-Range": `bytes */${file.size}` }, signal: options.signal });
    if (status.status === 308) {
      const range = status.headers.get("Range");
      offset = range ? Number(range.split("-").at(-1)) + 1 : 0;
      await options.onProgress(offset);
    } else if (status.ok) {
      await options.onProgress(file.size);
      return z.object({ id: z.string(), md5Checksum: z.string().optional() }).parse(await status.json());
    } else if (status.status === 404 || status.status === 410) {
      throw new Error("The saved Drive upload session expired. Remove and re-add this file to begin a new session.");
    } else {
      throw new Error(`Could not resume the Drive upload (${status.status}).`);
    }
  }
  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const response = await fetchWithBackoff(session, {
      method: "PUT",
      headers: { "Content-Length": String(end - offset), "Content-Range": `bytes ${offset}-${end - 1}/${file.size}` },
      body: file.slice(offset, end), signal: options.signal,
    });
    if (response.status === 308) {
      const range = response.headers.get("Range");
      offset = range ? Number(range.split("-").at(-1)) + 1 : end;
      await options.onProgress(offset);
      continue;
    }
    if (!response.ok) throw new Error(`Drive upload failed (${response.status}).`);
    await options.onProgress(file.size);
    return z.object({ id: z.string(), md5Checksum: z.string().optional() }).parse(await response.json());
  }
  throw new Error("Upload ended without a Drive file identifier.");
}
