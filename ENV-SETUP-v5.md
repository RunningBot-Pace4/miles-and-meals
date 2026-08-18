# Miles & Meals — Environment Setup v5

## Never paste Markdown into `.env`

Wrong:

```text
BETTER_AUTH_URL=[http://localhost:3000](http://localhost:3000)
ADMIN_EMAIL="[person@example.com](mailto:person@example.com)"
ADMIN_PASSWORD="Password\@123"
```

Correct:

```env
BETTER_AUTH_URL="http://localhost:3000"
ADMIN_EMAIL="person@example.com"
ADMIN_PASSWORD="Password@12345678"
```

## Local `.env`

```env
DATABASE_URL="YOUR_NEON_CONNECTION_STRING"
BETTER_AUTH_SECRET="YOUR_NEW_RANDOM_SECRET"

BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

ADMIN_NAME="Travel Admin"
ADMIN_EMAIL="YOUR_REAL_EMAIL"
ADMIN_PASSWORD="YOUR_STRONG_PASSWORD"

RESEND_API_KEY="YOUR_REAL_RESEND_API_KEY"
EMAIL_FROM="Miles & Meals <onboarding@resend.dev>"

RESET_DATABASE="NO"
```

## Vercel Environment Variables

Use your actual production URL, not localhost:

```env
DATABASE_URL="YOUR_NEON_CONNECTION_STRING"
BETTER_AUTH_SECRET="YOUR_NEW_RANDOM_SECRET"

BETTER_AUTH_URL="https://YOUR-PROJECT.vercel.app"
NEXT_PUBLIC_APP_URL="https://YOUR-PROJECT.vercel.app"

RESEND_API_KEY="YOUR_REAL_RESEND_API_KEY"
EMAIL_FROM="Miles & Meals <onboarding@resend.dev>"
```

For `onboarding@resend.dev`, the reset recipient must be the email address
associated with your own Resend account. For arbitrary recipients, verify a
domain in Resend and change `EMAIL_FROM` to that verified domain.

## v5 auth fix

Dynamic Better Auth base URLs now include an explicit `fallback`. This allows
direct server-side `auth.api.*` calls (for example admin/seeding flows) to work
even when no incoming Request is available.
