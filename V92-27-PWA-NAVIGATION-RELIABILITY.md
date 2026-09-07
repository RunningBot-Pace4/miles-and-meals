# V92.27 — Reliable installed-PWA navigation

## What the error screen means

The global error screen is a runtime boundary, not a page design. V92.24 moved
all app links to Next.js React Server Component transitions for speed. On the
installed iOS PWA, an interrupted or version-skewed RSC request can reject the
transition even though the destination page is healthy.

## Correction

- Normal browser use retains fast, prefetched Next.js client navigation.
- Installed PWAs use one immediate full-document request per internal tap.
- The client transition is cancelled before the document request starts, so
  two navigation mechanisms can never compete.
- There is no timeout, retry redirect or delayed fallback.
- The rotating Halo remains the PWA loading experience.
- The complete V92.26.4 nested-project cleanup is included.
- PWA cache updated to `miles-meals-static-v92-27`.

No Neon migration is required.
