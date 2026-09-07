# V92.26.3 — Nested source cleanup hotfix

## Cause

The deployed repository contains an accidental second project tree below
`src/lib`. Paths such as `src/lib/src/components/FullPageLink.tsx` and
`src/lib/tests/v92-19-payer-speed.test.ts` are duplicates, not application
modules. The navigation validator correctly rejected their direct Next.js link
imports.

## Correction

The existing prebuild cleanup now removes these impossible nested project
roots before navigation validation and TypeScript compilation:

- `src/lib/src`
- `src/lib/tests`
- `src/lib/scripts`

Normal files directly inside `src/lib` are not affected. V92.26 navigation,
the rotating Halo and the PWA cache remain unchanged. No Neon migration is
required.
