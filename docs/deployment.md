# Deployment

## Supabase

Create a project, apply the SQL migration, and copy the project URL plus server-only service role key into the deployment environment. Do not expose the service role key to the browser.

## Google Cloud

Configure the OAuth consent screen and create a Web OAuth client. Add the exact local and production callback URLs ending in `/api/auth/google/callback`. Request only `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/drive.file`. While the consent screen is in Testing, add every tester in Google Auth Platform → Audience.

## Vercel

Import the repository, keep the root directory at the monorepo root, use `npm run build`, and set all variables from `.env.example`. `NEXT_PUBLIC_APP_URL` must be the final HTTPS origin with no trailing slash. Deploy, then test sign-in, a small upload, manifest creation, sign-out/reconnect, and restoration of the original checksum.
