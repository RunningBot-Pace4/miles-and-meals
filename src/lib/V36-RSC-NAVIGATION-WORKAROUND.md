# Miles & Meals v36 — Next.js Client Navigation Reliability Workaround

## Root cause addressed

The neutral screen:

```text
This page couldn't load
Reload to try again, or go back.
```

is the Next.js built-in global client error UI.

v36 avoids the client-side RSC navigation path that can produce this failure
under a partial/interrupted RSC response.

## Navigation strategy

Until the affected Next.js navigation bug is resolved upstream, Miles & Meals
uses normal full-document navigation for user route changes.

Changes:

- all `next/link` usage replaced with `FullPageLink`
- all `useRouter()` navigation removed
- all `router.push()` removed
- all `router.replace()` removed
- all `router.refresh()` removed
- successful mutations use a full document reload/redirect

This is slightly less SPA-like, but substantially more defensive for the
current production deployment.

## Settlement live updates

Live settlement status still requires no manual refresh.

Instead of repeatedly calling `router.refresh()`:

1. `/api/live-refresh` returns the latest settlement version token for
   countries the signed-in user can access.
2. The client polls that small JSON endpoint.
3. Nothing happens while the version is unchanged.
4. When another traveler changes a payment status, the token changes.
5. The page performs one normal full document reload.

This removes recurring RSC refresh traffic while keeping live settlement
behavior.

## Error recovery

- `app/error.tsx` remains the route error boundary.
- `app/global-error.tsx` is now included as a root fallback.
- offline navigation still goes to `/offline.html`.
- PWA cache version is now `miles-meals-static-v36`.

## Heading style

The Home wording has a stronger editorial treatment:

- traveler name uses a coral highlight block
- `mile`, `meal`, `memory` use soft travel-color chips
- trip year uses a sea-blue badge
- trip note uses a coral badge

## Validation

```text
PWA validation: PASS
Navigation reliability validation: PASS
Service worker syntax: PASS
102 TS/TSX files: 0 syntax errors
0 possibly-null diagnostics
0 missing local imports
0 next/link imports
0 useRouter calls
```

## Run

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run pwa:check
npm run navigation:check
npm run build
npm start
```

No database migration is required.

After deploying to Vercel, fully close and reopen an installed PWA once while
online so the new service worker and client files are loaded.
