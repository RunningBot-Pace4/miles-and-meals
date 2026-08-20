# Miles & Meals v38 — Phase 8 Free

## Included

- Mobile pull-to-refresh
- Offline action protection
- Connection restored banner
- Settle Up automatic refresh retained at 4 seconds
- Expense live sync
- Planner live sync
- PWA update-ready prompt
- Free VAPID Web Push
- Payment / Expense / Planner notification preferences
- Home Screen app badge support where the browser/OS supports it
- Activity history
- JSON + CSV trip export
- Admin health page
- Authenticated client error logging to Neon
- Same-origin protection on all Miles & Meals mutation Route Handlers
- Playwright mobile Chrome, Mobile Safari and desktop test foundation
- Phase 8 build validation

## Required database upgrade

Run once:

```powershell
npm run db:push
```

Do not run `db:reset`.

## Optional push setup

After `npm install`:

```powershell
npm run push:keys
```

Add the generated values to local/Vercel environment variables:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
```

Web Push is optional. The rest of Phase 8 works without VAPID keys.

## Validate and build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run db:push
npm run pwa:check
npm run navigation:check
npm run phase8:check
npm test
npm run build
```

## Optional Playwright

```powershell
npm run test:e2e:install
npm run test:e2e
```
