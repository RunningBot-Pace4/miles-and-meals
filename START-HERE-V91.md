# Start here — V91 Living Journey

Miles & Meals `1.91.0` keeps the complete V90 product and adds the Living Journey experience.

## Deployment

1. Keep the V90 Neon migration already deployed. V91 has no database changes.
2. Deploy this complete source package to Vercel.
3. After deployment, open the app once online so the V91 service worker replaces the earlier cached design.
4. On iPhone or Android, remove and reinstall the PWA only if the operating system continues showing the previous app icon.

## What changed

- Interactive Living Journey Halo using real Move, Plan, Spend and People data.
- Data-rich current-Trip hero and Travel Command Centre.
- New visual system across Plan, Expenses, Settlement, Map, More and authentication.
- New app icon, maskable icons, Apple Touch icon, notification mark and favicons.
- Living Journey loading motion, launch screens and redesigned offline shell.
- Responsive containment for 320–430px phones and reduced-motion support.

Run `npm test`, `npm run v91:check`, `npm run typecheck` and `npm run build` before production deployment.
