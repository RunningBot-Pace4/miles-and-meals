# Miles & Meals — Forgot Password v3

This is the complete application source.

## Runtime fix

The authentication server now uses Better Auth's dynamic `baseURL.allowedHosts`
configuration and allows:

- `localhost:3000`
- `127.0.0.1:3000`
- Vercel deployment/preview hosts (`*.vercel.app`)
- hosts supplied by `BETTER_AUTH_URL`
- hosts supplied by `NEXT_PUBLIC_APP_URL`
- Vercel's current deployment and production URL environment variables

This prevents password-reset `redirectTo` requests from failing only because the
active Vercel deployment hostname differs from a manually configured URL.

The Forgot Password form also displays a useful error instead of hiding every
server error behind a generic message.

## Vercel environment variables

Configure at minimum:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (your canonical production URL)
- `NEXT_PUBLIC_APP_URL` (your canonical production URL)

For real reset emails also configure:

- `RESEND_API_KEY`
- `EMAIL_FROM`

After changing Vercel environment variables, redeploy.
