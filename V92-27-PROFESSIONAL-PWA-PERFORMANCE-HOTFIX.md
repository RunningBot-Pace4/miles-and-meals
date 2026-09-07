# V92.27 Professional PWA performance hotfix

## Scope

This hotfix keeps the existing routes, permissions, calculations, settlement rules,
database schema, visual identity and user flows intact. It changes only navigation
delivery, route-loading feedback and dashboard data scheduling.

## Navigation

- Normal internal taps use the existing prefetched Next.js client transition.
- The bottom navigation reflects the tapped destination immediately.
- A thin route-progress indicator provides instant feedback without blocking the app shell.
- If an interrupted client transition leaves the browser on the source URL, the error
  boundary performs one guarded full-document recovery to the intended destination.
- Recovery is loop-protected and is not the normal navigation path.
- The service-worker cache key is bumped so installed PWAs receive the new navigation code.

## Home performance

- Settlement ledger reads are batched across destinations instead of issuing a separate
  country/expense/split/payer/settlement/user sequence for every destination.
- Expense summaries reuse the participant data already produced by the settlement ledger.
- Trip command-centre database reads start in parallel with the dashboard finance reads.
- Financial command-centre calculations still use the same budget/share values and formulas.

## Loading experience

The authenticated route boundary now keeps the top bar and bottom navigation stable and
renders a lightweight skeleton inside the content area instead of covering the whole PWA
with a blocking full-screen route loader.

## Validation

`npm run prebuild` passes, including all project validation gates, route integrity,
source integrity and TypeScript type checking.

A full local `next build` cannot complete in the supplied dependency snapshot because it
contains platform-specific dependencies from another OS and this execution environment
cannot download the Linux SWC package. Vercel installs the correct platform dependencies
during deployment.
