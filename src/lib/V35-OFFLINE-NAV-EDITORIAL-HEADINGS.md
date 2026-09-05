# Miles & Meals v35 — Safer Offline Navigation + Editorial Headings

## 1. Page-load/offline reliability

The recurring browser/PWA "This page couldn't load" failure is reduced at the
two main sources found in v34.

### Live settlement/dashboard refresh

`SettlementLiveRefresh` no longer calls `router.refresh()` blindly.

Before refreshing it now requires:

- browser reports online
- tab is visible
- no blocking action overlay is active
- no previous live refresh is already running
- `/api/live-refresh` responds successfully within 3.5 seconds

The authenticated probe confirms the app/session can reach the server before a
Server Component refresh is triggered.

Polling pauses offline and refreshes once safely after `online`, focus, or tab
visibility returns.

### Offline navigation

`OfflineNavigationGuard` captures same-origin link taps while the browser is
offline and sends them directly to the cached `/offline.html` shell instead of
allowing a Next.js client navigation to fail.

The Home Trip selector has the same offline protection for its programmatic
`router.push()` navigation.

### App error recovery

`src/app/error.tsx` provides a branded retry/back screen for App Router render
or Server Component failures that reach the application error boundary. If the
browser is offline, it redirects to the offline shell.

### Service worker

The service-worker cache version is bumped to `miles-meals-static-v35`, so
installed devices replace the prior Phase 7 cache after deployment.

## 2. Heading design

The rainbow/every-word color treatment is removed.

### Welcome

- "Welcome back," — deep travel teal
- traveler name — coral
- traveler name has a hand-drawn warm amber underline
- tagline remains neutral
- only `mile`, `meal`, and `memory` get travel accent colors
- `memory` receives a small travel sparkle

### Trip title

For a title such as:

```text
Vietnam 2026 (Working Trip)
```

the treatment is:

- `Vietnam` — deep teal with route-style underline
- `2026` — sea blue
- `(Working Trip)` — compact amber capsule

Desktop remains one line when space allows; mobile wraps naturally.

## Database

No database migration is required for v35.

## Validate / run

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run pwa:check
npm run build
npm start
```

For the PWA/offline behavior, test the production build or deployed HTTPS
Vercel site. After deployment, reopen the installed app once while online so
the v35 service worker can activate.
