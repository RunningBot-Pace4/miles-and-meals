# Miles & Meals V92.8 · Connected Home and Usability Pass

Version `1.92.8` keeps the approved light Living Journey design while making expense entry, settlement and the Home command centre more compact, understandable and data-rich.

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
- Selected tabs and active navigation use only a clean blue outline: no black fill, white text or check mark.
- Halo selection moves to the newly touched mode immediately, without Safari's grey tap flash.
- Larger touch targets and a restrained detail-panel transition keep Move, Plan, Spend and People easy to use and visually stable.
- All four information panels now share one equal-height stack, so the Halo, tab row, page height and bottom navigation do not jump when a mode changes.
- Move, Plan, Spend and People stay in four equal-width fixed columns; selection cannot resize, translate or overlap a neighbouring tab.
- The four controls now live in their own grid instead of sharing the Halo circle's legacy positioning context, removing the underlying CSS conflict rather than masking it.
- Bottom navigation shows only the newly tapped destination while the page opens.
- More-page rows keep a blue outline while the selected destination opens.
- One controlled service-worker activation path with automatic reload timeout and a visible Retry state.
- Reliable native document navigation for authenticated pages so a stale installed-PWA client cannot request an incompatible React Server Component payload.
- Reduced and protected background polling, plus a five-minute offline-pack refresh throttle.
- Health checks now distinguish a genuinely missing table from a temporary Neon query failure.
- Optional remembered email and persistent session; passwords remain with the device/browser password manager and are never stored by the app.
- One sign-in loading state instead of an overlay followed by a second loader.
- Node.js 24 matches the Vercel project setting, removing the engine-override warning.
- Compact 48 px date, Trip and description controls replace the oversized expense-entry fields.
- Expense categories expose their real selected state with the requested blue outline.
- Password visibility uses an accessible eye/eye-off icon instead of Show/Hide wording.
- Saved traveller splits are now an optional collapsed shortcut with a clear explanation.
- Settlement rows keep names, amount, currency and payment controls in stable responsive columns.
- The Halo uses full-Trip wallet totals while retaining today's context, so existing spending no longer appears missing.
- The redundant lower yellow Home hero is removed; its trip selector, dates and wallet data now live inside the top command centre.

## Database

**No Neon or database migration is required for V92.** This release changes presentation and PWA assets only. Existing deployments must already have the V85 and V90 migrations applied.

If App Health reports that required tables are missing with PostgreSQL code `42P01`, back up Neon and apply `neon-upgrade-v90-combined.sql` once. A connection or query failure now shows separate guidance and is not a reason to rerun SQL blindly.

## Deploy

1. Upload or connect the complete V92 source to Vercel.
2. Keep the same production environment variables used by V90/V91.
3. Deploy without running a new SQL script.
4. Open the deployed app once online, accept the update, then allow the app to reload so `miles-meals-static-v92-8` activates.
5. If an older installed icon remains, remove the old PWA once and install it again; operating systems can retain home-screen icon caches independently from Vercel.

## Validate locally

```bash
npm install
npm run v92:check
npm test
npm run build
```

Authenticated Playwright verification needs `E2E_EMAIL` and `E2E_PASSWORD`.
