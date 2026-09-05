# Miles & Meals v44 — In-Place Live Settlements

## 1. Everyone's trip money on Home

Home now shows the full trip-money cards for every traveler:

- Expense paid
- Personal share
- Received
- Settlement paid
- Still receive
- Still pay
- Confirmed balance

The cards use the same settlement ledger as Settle Up.

## 2. No page reload after Mark Paid / Mark Received

Settlement actions no longer call:

```text
window.location.reload()
```

After the server confirms the action:

1. the button emits an in-page settlement update event
2. the live settlement workspace fetches the latest settlement summary
3. only the settlement UI state changes
4. the page itself stays exactly where the user was

There is no full-screen loading overlay and no page jump.

## 3. Other traveler auto-update remains

Home and Settle Up poll the settlement summary every 4 seconds.

The poll updates only React state inside the settlement workspace. It does not
reload the document.

Focus, reconnect and visibility changes also trigger a safe in-place refresh.

If a settlement action occurs during an existing poll, the refresh is queued
and runs immediately after the current request finishes.

## 4. Form/data-loss protection

Settlement activity can no longer trigger full-page reload from the generic live
refresh component.

The Expenses page also no longer subscribes to the settlement reload channel.

This means a payment update from another traveler cannot reload an Expense page
or other page just because the settlement version changed.

## 5. Access-safe live summary API

New route:

```text
GET /api/settlements/summary
GET /api/settlements/summary?country=<country-id>
```

The route:

- requires authentication
- uses explicit country assignments
- rejects inaccessible country IDs
- calculates data through the canonical settlement ledger
- returns no-store JSON for live use

## Database

No database migration is required for v44.

## Validation

```text
PWA validation: PASS
Navigation validation: PASS
Phase 8 / v44 validation: PASS
Service worker syntax: PASS
Phase 8 validator syntax: PASS

128 TS/TSX files scanned
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports
0 v44 non-module diagnostics

Settlement action page reload present: false
Home full trip-money workspace: true
Live settlement poll: 4 seconds
```

## Build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run cleanup:legacy
npm run phase8:check
npm test
npm run build
```
