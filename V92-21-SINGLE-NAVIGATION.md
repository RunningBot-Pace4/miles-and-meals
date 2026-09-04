# V92.21 Single Navigation and Restored Halo

V92.21 fixes the repeated “This page needs a fresh load” screen and the visible double loading reported in the installed PWA.

## Root cause

V92.19 reintroduced Next.js client transitions after the app had previously disabled them for reliability. Each shared link could start a React Server Component transition and then start a second full-document request after a 4.5-second timeout. An interrupted or deployment-version-mismatched transition could therefore show two loading sequences or enter the global error boundary.

## Correction

- Every shared route link now performs exactly one normal document navigation.
- The 4.5-second second-navigation fallback has been removed completely.
- The approved rotating Halo appears during that one request.
- The original PWA launch artwork and Halo rotation are restored.
- A 12-second safety timer can only dismiss a stuck visual indicator; it cannot navigate or reload.
- The navigation integrity check again rejects all `next/link`, `useRouter`, `router.push`, `router.replace` and `router.refresh` usage.
- The global fallback no longer incorrectly describes every app error as a client-side transition failure.
- The PWA cache is bumped so old and new navigation code cannot remain mixed.

No database migration is required.
