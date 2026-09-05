# V92.26 — Vercel navigation recovery

## Root cause

V92.25 added a custom Next.js `deploymentId` to a normal Vercel source build.
That setting made every client-side page request carry a custom deployment
header. Custom deployment IDs are intended for prebuilt deployments; Vercel
already provides zero-configuration skew protection when it runs a supported
Next.js source build. The competing identity could reject ordinary route
requests and send every page tap into the global error boundary.

## Correction

- Removed the custom `deploymentId` and all Git/deployment-ID rewriting.
- Returned normal source deployments to Vercel-managed skew protection.
- Restored adaptive Next.js prefetch so common destinations begin loading before the tap.
- Kept exactly one client-side navigation request and the rotating Halo.
- Removed the automatic error-boundary reload, so a failed request can never create a second navigation or double loading sequence.
- Added an optional error reference to genuine error screens for support diagnosis.
- Updated the installed PWA cache to `miles-meals-static-v92-26`.

## Deployment

No Neon migration is required. Do not add `NEXT_DEPLOYMENT_ID` manually for a
normal Vercel source/Git deployment. In Vercel project settings, keep access to
System Environment Variables enabled and use Vercel's Skew Protection setting
when available.
