# Shared routes and PWA update

## Deploy

1. In Neon SQL Editor, run `database/V96-shared-route-distances.sql` against the same database used by Vercel. It only adds the shared route table; it does not clear trips, users or payments.
2. Deploy this complete source folder to your existing Vercel project. Keep your existing environment variables, including DATABASE_URL, authentication settings and GEOAPIFY_API_KEY.
3. Reopen the PWA after deployment. In Plan, select the trip and walking/driving mode, review the stay/place pins, then press Check distances. Saved results are shared across the trip's devices.

Do not run a RESET or cleanup SQL file as part of this update.

## Changes

- Route results are stored in Neon, separately for each trip, stay, place and travel mode. Viewing saved routes does not call the routing provider.
- Check distances / Recalculate explicitly refreshes results across Places, Meals and Shopping for the chosen trip and mode.
- Changing a stay or destination pin invalidates its old results. Missing coordinates are not guessed from a name.
- Review pins shows the stay and destination together, with direct coordinate links if the map cannot load.
- Failed recalculations retain previous valid results. A definitive no-route response clears an obsolete result.
- Home distinguishes sent/awaiting confirmation, incoming money to confirm, confirmed paid and confirmed received, grouped by currency. Pending amounts remain reserved while the remaining balance can still be paid.
- Existing receipt allocation, partial payment, cancellation and trip/receipt selector behaviour are retained.
- Native navigation retains the current page with a small accessible progress indicator. It still makes one navigation request.
- New summaries and route panels use responsive layouts; the service worker cache version is bumped.

## Validation and limits

- Production npm run build passed, including release checks and TypeScript.
- 386 tests passed; four database concurrency tests skipped without a test database.
- New tests cover shared route access, closed trips, stale coordinates, database-sourced endpoints, no-route invalidation, currency separation and pending versus confirmed payment totals.
- No production database, live payment or deployment was modified.
- Browser installation failed in this environment. Real iPhone/PWA layout, keyboard, offline navigation and live map rendering still require device acceptance testing.
- Routing responses were tested with mocks. Walking/driving distances are provider estimates, not Google Maps distances or live traffic. This release does not claim live traffic support.
- The Neon migration must be applied before use; live migration execution was not tested here.

## Quick acceptance check

After deploying: calculate a route, reopen the trip on another device, and check that its distance is already available. Change a destination pin and verify its previous result disappears until recalculated. Send a partial payment, check the remaining balance, then cancel and confirm the pending record and total disappear. Verify navigation responds on the first tap and the current page remains visible until the next page loads.
