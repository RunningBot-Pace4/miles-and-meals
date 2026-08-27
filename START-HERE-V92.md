# Miles & Meals V92.1 · Light Halo PWA Design

Version `1.92.1` applies the approved light Halo presentation across the complete product while preserving the V90–V91 data model, permissions, financial rules and offline behavior.

## What changed

- White/light app canvas with restrained blue, yellow, peach and green accents.
- Thin four-segment Halo with Move, Plan, Spend and People modes.
- Data-first Home hierarchy: current action first, useful detail second and connected actions third.
- Compact light cards, black primary actions and progressive disclosure across Plan, Map, expenses, receipts, settlement, documents, offline, Companion, people, memories, notifications, settings and admin.
- Dedicated mobile PWA treatment for 320, 360, 390 and 430 px.
- Dedicated PC sidebar and wider data layouts from 1024 px.
- New V92 app icon, versioned manifest, Apple icon, maskable icons, notification icon and service-worker cache.
- Light launch, loading and standalone offline experiences.
- Compact animated Halo loader, restored centre Add button and explicit More-page context labels.
- Repeated “Living Journey” promotional wording removed from the interface.

## Database

**No Neon or database migration is required for V92.** This release changes presentation and PWA assets only. Existing deployments must already have the V85 and V90 migrations applied.

## Deploy

1. Upload or connect the complete V92 source to Vercel.
2. Keep the same production environment variables used by V90/V91.
3. Deploy without running a new SQL script.
4. Open the deployed app once online so `miles-meals-static-v92-1` activates.
5. If an older installed icon remains, remove the old PWA once and install it again; operating systems can retain home-screen icon caches independently from Vercel.

## Validate locally

```bash
npm install
npm run v92:check
npm test
npm run build
```

Authenticated Playwright verification needs `E2E_EMAIL` and `E2E_PASSWORD`.
