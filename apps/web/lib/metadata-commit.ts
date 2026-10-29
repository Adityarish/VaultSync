export interface BackupMetadataPayload {
  backupId: string;
  localId: string;
  driveFileId: string;
  name: string;
  relativePath: string;
  size: number;
  mimeType: string;
  lastModified: number;
  category: string;
  checksum: string;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type Waiter = (milliseconds: number) => Promise<void>;

const wait: Waiter = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function responseDetails(response: Response): Promise<{ error?: string; code?: string; requestId?: string }> {
  return response.clone().json().catch(() => ({})) as Promise<{ error?: string; code?: string; requestId?: string }>;
}

export async function commitBackupMetadata(
  payload: BackupMetadataPayload,
  options: { fetcher?: Fetcher; waiter?: Waiter; attempts?: number } = {},
): Promise<void> {
  const fetcher = options.fetcher ?? fetch;
  const waiter = options.waiter ?? wait;
  const attempts = options.attempts ?? 3;
  let lastResponse: Response | undefined;
  let lastNetworkError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetcher("/api/backups/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) return;
      lastResponse = response;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === attempts - 1) break;
    } catch (error) {
      lastNetworkError = error;
      if (attempt === attempts - 1) break;
    }
    await waiter(400 * 2 ** attempt);
  }

  if (lastResponse) {
    const details = await responseDetails(lastResponse);
    if (lastResponse.status === 401) throw new Error("Your VaultSync session expired. Reconnect Google Drive, then retry; the file already in Drive will not upload again.");
    if (lastResponse.status === 400) throw new Error(details.error || "The uploaded file metadata was invalid. Remove this queue item and select the file again.");
    const reference = details.requestId ? ` Reference: ${details.requestId}.` : "";
    throw new Error(`The file reached Drive, but VaultSync could not confirm its recovery metadata after ${attempts} safe attempts.${reference} Retry to finish without uploading the file again.`);
  }

  const suffix = lastNetworkError ? " Check your connection and retry." : "";
  throw new Error(`The file reached Drive, but the metadata service did not respond.${suffix} The file will not upload again.`);
}
