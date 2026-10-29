# Vercel deployment

The repository is deployment-ready, but the first live connection still needs your Vercel, Supabase, and Google Cloud accounts. Do not commit `.env.local`, refresh tokens, service-role keys, or generated secrets.

## VaultSync production URLs

- Application origin: `https://vaultsync-mu.vercel.app`
- Google authorized JavaScript origin: `https://vaultsync-mu.vercel.app`
- Google authorized redirect URI: `https://vaultsync-mu.vercel.app/api/auth/google/callback`

Enter these values exactly. Do not add a trailing slash and do not use a Vercel preview URL for this OAuth client.

## 1. Prepare Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/202610280001_initial_vaultsync.sql`.
3. Copy the project URL and server-only service role key. The service role key must never use a `NEXT_PUBLIC_` name.

## 2. Import into Vercel

1. Push this repository to the Git provider you will connect to Vercel.
2. In Vercel choose **Add New → Project** and import the repository.
3. Keep **Root Directory** at the repository root (`.`). The committed `vercel.json` runs `npm ci`, executes the workspace build, and publishes `apps/web/.next`.
4. Use the **Next.js** framework preset. Do not select `apps/web` as the Root Directory; doing that prevents the deployment from using the root lockfile and workspace configuration.
5. The first deployment may render the safe disconnected state while account variables are still absent.

## 3. Add Vercel environment variables

In **Project → Settings → Environment Variables**, add these to Production. Add them to Preview only if preview deployments should connect to the same private backend.

- `NEXT_PUBLIC_APP_URL` — `https://vaultsync-mu.vercel.app`; HTTPS only and no trailing slash.
- `GOOGLE_CLIENT_ID` — Google OAuth Web client ID.
- `GOOGLE_CLIENT_SECRET` — matching Google OAuth client secret.
- `SESSION_SECRET` — at least 32 random characters; generate with `openssl rand -base64 48`.
- `TOKEN_ENCRYPTION_KEY` — exactly 32 random bytes encoded as base64; generate with `openssl rand -base64 32`.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key; server-only despite the other Supabase variable being public.
- `LOG_LEVEL` — optional; `info` is suitable for production.
- `MOCK_DATA` — omit it or set `false` in production.

Environment changes apply only to new deployments, so redeploy after saving them. Run `npm run vercel:check` locally when equivalent variables are present; it reports only missing/invalid variable names and never prints secret values.

## 4. Configure Google OAuth

In the same Google Cloud project as `GOOGLE_CLIENT_ID`:

1. Configure the OAuth consent screen.
2. Create or edit a **Web application** OAuth client.
3. Add `https://vaultsync-mu.vercel.app/api/auth/google/callback` under **Authorized redirect URIs**.
4. Add `https://vaultsync-mu.vercel.app` under **Authorized JavaScript origins**.
5. While the consent screen is in Testing, add every permitted Google account under **Google Auth Platform → Audience → Test users**.
6. Keep scopes limited to `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/drive.file`.

Copy the client ID and client secret from this same Web application into Vercel as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Never put the client secret in a `NEXT_PUBLIC_` variable.

Use the stable production domain for OAuth. Random Vercel preview URLs are not automatically valid Google redirect URIs.

## 5. Redeploy and verify

Redeploy after the environment variables and Google callback are configured, then verify in this order:

1. `/api/auth/me` loads without a server-configuration error.
2. Connect Google Drive and return to `/settings?connected=1`.
3. Upload at least three small files and confirm parallel progress plus committed metadata.
4. Upload a VCF, open it from **Contacts**, search a name, inspect all numbers, and export one contact.
5. Download a large file. Production file bytes travel directly between the browser and Google Drive rather than through a Vercel Function payload.
6. Sign out, reconnect, and restore a file whose SHA-256 matches the original.

The custom local `server.mjs` is only used by `npm run dev` and `npm run start`. Vercel deploys the Next.js routes as managed functions and does not run that custom server.
