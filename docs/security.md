# Security model

- OAuth uses state, PKCE, an exact redirect URI, offline access, and `drive.file` rather than full Drive access.
- Refresh and access tokens are encrypted at rest with a 32-byte deployment key. Refresh tokens never enter browser storage or client JavaScript.
- Sessions are 256-bit random values; only SHA-256 hashes are stored in the database. Cookies are HTTP-only, SameSite=Lax, scoped to `/`, and Secure in production.
- Supabase tables have RLS enabled and browser roles revoked. The server service role must never use a `NEXT_PUBLIC_` variable.
- Input metadata is validated with Zod. Backup metadata is returned only after resolving the opaque session, and direct Drive reads require a short-lived token from that same authenticated session.
- Logs contain event names and sanitized errors, never filenames, file bodies, contact data, tokens, or OAuth codes.
- File integrity uses SHA-256. A successful upload is not called verified until Drive completion and metadata commit both succeed.

Before production, rotate all secrets, configure HTTPS, restrict OAuth origins and redirects, enable Supabase backups, add rate limiting at the edge, and complete an external security review.
