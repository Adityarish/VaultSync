# API surface

- `GET /api/auth/google` — starts Google OAuth with PKCE and state protection.
- `GET /api/auth/google/callback` — exchanges the code, encrypts tokens, registers a browser device, and creates an opaque session.
- `GET /api/auth/me` — returns non-secret account and connection state.
- `POST /api/auth/token?category=…` — returns a short-lived Drive access token plus the canonical destination folder ID.
- `POST /api/auth/signout` — removes the current server session.
- `POST /api/backups/items` — validates and commits a verified Drive item to a user-scoped backup job.
- `POST /api/backups/:id/complete` — writes the manifest to Drive, then atomically finalizes the database snapshot.
- `GET /api/backups` — lists recovery metadata owned by the current user.
- `GET /api/drive/files/:id/download` — streams an owned, verified Drive file with private no-store headers.

All private endpoints require the HTTP-only session cookie. Error bodies never include provider credentials.
