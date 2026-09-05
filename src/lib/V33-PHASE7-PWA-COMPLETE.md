# Miles & Meals v33 — Phase 7 PWA Complete

## Phase 7 status

- Install to Home Screen: complete
- Offline shell: complete
- Mobile icons: complete
- Splash / launch screen: complete

## Offline strategy

Miles & Meals uses a privacy-safe offline shell.

The service worker:

- precaches `/offline.html`
- precaches app icons
- caches Next.js static assets on demand
- uses network-first handling for page navigation
- falls back to `/offline.html` when navigation has no connection
- leaves authenticated app/API requests network-only

Authenticated trip, expense and settlement HTML is intentionally not stored in
the service-worker page cache.

When the app is already open and the device goes offline, a banner appears
without discarding the current screen.

## Splash / launch screen

Installed standalone mode has a branded Miles & Meals launch screen.

The app also includes portrait Apple startup image assets for common iPhone and
iPad sizes. The in-app launch screen provides a consistent branded handoff even
where OS-level web-app splash behavior varies.

## Install and icons

The existing v32 PWA installation remains:

- standalone manifest
- Apple touch icon
- 192x192 PWA icon
- 512x512 PWA icon
- SVG fallback icon
- Android manifest shortcuts

## Validation

Run:

```powershell
npm run pwa:check
```

The normal build now validates required PWA files automatically.

## Test locally

Service-worker registration is production-only.

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run pwa:check
npm run build
npm start
```

Then test:

1. Open the local production site.
2. Load Miles & Meals once while online.
3. Turn off network / use browser Offline mode.
4. Reload or navigate.
5. Confirm the branded offline shell appears.
6. Restore the network and press Try again.

For a real phone, test the deployed HTTPS Vercel site.

## Database

No database migration is required for v33.
Do not reset the database.
