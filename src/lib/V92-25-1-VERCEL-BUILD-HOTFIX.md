# V92.25.1 — Vercel build hotfix (superseded by V92.26)

V92.26 removes the custom deployment identity entirely for normal Vercel
source builds. Use the V92.26 package instead of this interim approach.

This source package preserves the complete V92.25 receipt, mobile-navigation,
viewport-containment and PWA recovery release.

## Fixed

- Vercel's unique `VERCEL_DEPLOYMENT_ID` is now preferred for Next.js version-skew protection.
- The platform's reserved `dpl_` prefix is removed before the value is supplied as a custom deployment ID.
- The Git commit SHA fallback is capped at 32 characters, preventing the Vercel build error caused by a complete 40-character SHA.
- A manually supplied `NEXT_DEPLOYMENT_ID` receives a clear validation error when it violates Vercel's character or length rules.
- Exact reviewed versions of esbuild, Sharp and Tesseract are recorded in `allowScripts`, resolving npm's unreviewed install-script warnings without permitting arbitrary dependency scripts.

## Deployment

No Neon migration is required. Deploy the complete source package using the same environment variables as V92.25.

If a custom `NEXT_DEPLOYMENT_ID` was manually added in Vercel, remove it or keep it at 32 permitted characters or fewer. Standard Vercel deployments should use the automatically populated `VERCEL_DEPLOYMENT_ID`.
