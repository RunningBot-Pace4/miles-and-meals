# Start here — V85 Combined

## Normal upgrade from V82.2

1. Back up Neon or create a temporary Neon branch.
2. Open Neon SQL Editor and run `neon-upgrade-v85-combined.sql` once.
3. Upload/deploy this complete source package to Vercel.
4. Confirm the existing Vercel environment variables are still present: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` or `NEXT_PUBLIC_APP_URL`, and your optional Web Push keys.
5. After deployment, open the PWA once while online so the V85 service worker replaces the older cache.

Do not run `db:reset`, `db:reset:keep-login`, or either Neon reset SQL file during an upgrade. Those commands deliberately delete application data.

## Local verification

```bash
npm install
npm run release:check
npm run build
```

Authenticated phone audit:

```bash
E2E_EMAIL="test@example.com" E2E_PASSWORD="your-test-password" npm run test:e2e -- e2e/mobile-v85-combined.spec.ts
```

The E2E account should have at least one open Trip. Browser tests skip safely if the two credentials are not supplied.

## Main new screens

- Home: Trip Command Centre.
- Plan: Tasks, Packing, day ordering, route, calendar and reviewed import.
- More → Receipt review.
- More → Budgets & category limits.
- More → Sync Centre / Offline.
- Expense edit: comments and corrections.
- Settlement: full or partial payment amount.

Trip Inbox and flight-number guessing remain intentionally removed.
