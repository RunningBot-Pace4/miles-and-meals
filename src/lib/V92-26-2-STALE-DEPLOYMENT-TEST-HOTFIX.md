# V92.26.2 — Stale deployment-test hotfix

## Cause

An archive extracted over V92.25.1 could retain
`tests/v92-25-1-deployment-id.test.ts`. That retired test imports the removed
`resolveDeploymentId` helper, so TypeScript stops before the production build.

## Correction

The prebuild legacy cleanup now removes all three retired deployment-recovery
artifacts before validation and TypeScript:

- `src/lib/route-recovery.ts`
- `tests/v92-25-1-deployment-id.test.ts`
- `scripts/validate-v92-25-1.mjs`

The V92.26 application code, single-navigation behavior, rotating Halo and PWA
cache are unchanged. No Neon migration is required.
