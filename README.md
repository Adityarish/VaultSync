# VaultSync

VaultSync is a privacy-sensitive, installable Next.js PWA that backs up user-selected files directly to the user's own Google Drive. The browser receives a short-lived Drive access token; Google refresh tokens remain encrypted in Supabase and are never exposed to client JavaScript.

## What works

- Google OAuth authorization-code flow with PKCE and the limited `drive.file` scope
- Server-side opaque sessions and AES-256-GCM token encryption at rest
- Canonical Drive folder IDs and per-device/category folder provisioning
- Persistent IndexedDB file queue with SHA-256 change detection, deduplication, pause, retry, cancellation, three-file parallel processing, and 8 MB resumable chunks
- Verified metadata, a machine-readable Drive manifest, and snapshot finalization
- Gallery/files/history/restore views backed only by committed metadata
- Application-backup workspace for user-selected APK/APKS/XAPK files and validated Android inventory snapshots
- Backed-up VCF browser with contact search, phone-number details, single-contact device export, local import, duplicate detection, and explicit backup queuing
- Vercel-ready workspace build with direct browser-to-Drive bulk transfers
- Offline app shell and honest PWA scheduling boundaries
- Supabase schema, indexes, RLS lockdown, and user-scoped server queries

## Local setup

1. Create a Supabase project and run `supabase/migrations/202610280001_initial_vaultsync.sql` in the SQL editor.
2. Create a Google OAuth Web application. Add `http://127.0.0.1:3000/api/auth/google/callback` as an authorized redirect URI.
3. Copy `.env.example` to `.env.local` at the repository root or `apps/web/.env.local` and fill every required value. Generate secrets:

   ```bash
   openssl rand -base64 48
   openssl rand -base64 32
   ```

   Use the first for `SESSION_SECRET` and the second for `TOKEN_ENCRYPTION_KEY`.
4. Install and start:

   ```bash
   npm install
   npm run dev
   ```

Open <http://127.0.0.1:3000>. The app intentionally shows a disconnected state until configuration and authorization are real.

## Production

The production app is `https://vaultsync-mu.vercel.app`. In Vercel, set `NEXT_PUBLIC_APP_URL=https://vaultsync-mu.vercel.app`. In the matching Google OAuth Web client, set the authorized JavaScript origin to `https://vaultsync-mu.vercel.app` and the authorized redirect URI to `https://vaultsync-mu.vercel.app/api/auth/google/callback`. Import the repository with its root directory set to `.`; the committed `vercel.json` builds the web workspace. Run `npm run vercel:check` and `npm run build` before deployment. Follow [docs/deployment.md](docs/deployment.md) for the exact Vercel, Supabase, and Google Cloud sequence.

No private file contents, tokens, or credentials belong in Git.

## Application inventory format

The web app can list an inventory exported by the future Android companion, but a browser cannot inspect the complete installed-app list itself. Import a JSON file no larger than 2 MB using this versioned shape:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-10-29T08:00:00.000Z",
  "deviceName": "My Android phone",
  "apps": [
    {
      "packageName": "com.example.notes",
      "displayName": "Notes",
      "versionName": "1.2.3",
      "versionCode": 123,
      "installationSource": "Google Play",
      "apkBackupFilename": "notes.apk",
      "exportEligible": true
    }
  ]
}
```

The inventory is metadata only. APK installation always uses Android's normal confirmation flow, and protected app data is never available to VaultSync.
