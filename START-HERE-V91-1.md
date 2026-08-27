# Start here — V91.1 Living Journey correction

Miles & Meals `1.91.1` includes the Living Journey product design and corrects three release problems: stale retired-route metadata, legacy CSS overriding the new layout, and PWA icon caching.

## Deployment

1. Keep the V85 and V90 Neon migrations already deployed. V91.1 has no database changes.
2. Deploy this complete source package to Vercel. Prefer a clean project directory instead of extracting over generated `.next` output.
3. The build now removes `.next` before route discovery and removes `.next/types` before standalone TypeScript checks.
4. After deployment, open the app online once so `miles-meals-static-v91-1` activates.
5. Hard-refresh browser tabs. If an installed iPhone or Android home-screen icon remains old, remove that installed PWA and add it to the home screen again; mobile operating systems may retain an installed icon independently of the website cache.

## What changed

- Living Journey is imported after the legacy stylesheet and owns the final desktop/PWA/mobile cascade.
- The Home hero has explicit PC and mobile grid geometry plus 320–430 px containment.
- The retired Trip Inbox stays removed; stale generated imports are cleared before typecheck, dev and build.
- Manifest, standard icons, maskable icons, Apple Touch icon, launch animation and notification badge use V91.1-specific URLs.
- Next file-based icon metadata and no-cache headers reinforce icon delivery on Vercel.

## Verification

Run:

```bash
npm test
npm run v91-1:check
npm run typecheck
npm run build
```

If the old missing-Inbox error appears in an older checkout, run `npm run cleanup:next` once, then repeat the build.
