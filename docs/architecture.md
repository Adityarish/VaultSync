# Architecture

The browser owns file selection, checksumming, queue persistence, and resumable transfer. File bytes go from the browser directly to Google Drive over HTTPS; the Next.js server is not a bulk-file proxy.

The web server owns OAuth exchange, refresh-token handling, opaque sessions, Drive folder provisioning, recovery metadata, manifest finalization, and authenticated downloads. Provider tokens are encrypted with AES-256-GCM before they reach Supabase. The browser may request a short-lived access token for an active upload, but never receives a refresh token.

Supabase holds metadata only. All browser roles are revoked from the private tables. Server queries use the service role and scope every data lookup by the user ID resolved from a hashed opaque session token. Final snapshot creation is performed by `finalize_backup` in one PostgreSQL transaction after the JSON manifest reaches Drive.

IndexedDB separates searchable metadata from queued `File` blobs. A queue entry becomes `verified` only after the Drive upload completes and recovery metadata commits. If metadata commit fails after upload, the local Drive file ID is retained so retry finalizes metadata without re-uploading bytes.

The PWA caches only its shell and navigational pages. It does not cache entire private media collections.
