# v81 Flight Accuracy, Closed Trip, Offline and Mobile Audit

## What changed

### Booking and flight details

The local booking parser now searches departure-labelled text first. It excludes booking-created, ticket-issued, payment, transaction and email-sent timestamps, supports numeric and month-name dates, and converts AM/PM times to the stored 24-hour airport-local value.

Entering only a flight number no longer invents a date, time or route. The review screen requires a date and can call the authenticated `/api/flight-lookup` endpoint. The server keeps the provider key private, requests a flight-number/date match, rejects non-exact results, and copies only the exact scheduled airport-local values into the editable review.

Configure this optional feature in the deployment environment:

```text
AVIATIONSTACK_API_KEY=your_server_only_key
```

If the provider is disabled, its subscription does not support the requested date, or no exact result exists, the imported/manual values remain unchanged. Uploading or pasting the airline confirmation is still the most reliable source for a private booking; a PNR alone cannot retrieve a private reservation.

### Closed Trip means read-only

`CLOSED` is now enforced as a Trip-wide write barrier. Both visible controls and server routes block changes to:

- Trip name, dates, destination FX and deletion;
- traveler assignments and invite creation/revocation/acceptance;
- personal budgets;
- Plan create/edit/delete and Trip Inbox import/Add to Plan;
- expenses and offline expense sync;
- live-location writes;
- adding/removing a closed Trip from a Journey or deleting its Journey grouping;
- equivalent System Admin Trip/country/assignment mutations.

Existing Trip, Plan, booking, budget and location information stays viewable. Settlement calculations, history and repayment confirmation stay available. Only the Trip Owner or System Admin can reopen the Trip from Settlement, after which normal writes resume.

### Offline all-Trips and correct resync

While signed in and online, `/api/offline-pack?all=1` builds a pack for every accessible Trip. The client stores them atomically without changing the remembered selection and removes packs that are no longer accessible on the next complete refresh.

Each queued Quick Expense contains the original Trip country ID, current user, destination/base currency, rate and member split. Reconnection therefore syncs it to the Trip selected when it was created—not whichever Trip happens to be active later. A closed Trip remains viewable offline but cannot queue a write.

Offline packs contain private Trip data in local browser storage. Sign-out cleanup remains responsible for clearing that device data.

### Mobile/PWA layout

The final containment layer applies `min-width: 0`, `max-width: 100%` and full-width sizing to native form controls, with specific handling for date/time/month inputs. Multi-column input groups collapse to one column below 720px. The standalone offline HTML now collapses at 640px, contains long Trip names, and prevents the native date field from forcing horizontal overflow.

Authenticated E2E coverage traverses the application’s main routes at 320, 360, 375, 390, 412 and 430px, checking document width, every visible input/select/textarea/button boundary and 16px mobile form text. Separate tests seed two offline Trips and verify the standalone shell at 320, 390 and 430px.

## Upgrade

v81 has no new database schema. From a working v77–v80 database:

```bash
npm install
npm run release:check
npm run build
```

Deploy the new source so `miles-meals-static-v81` replaces stale PWA assets. Add `AVIATIONSTACK_API_KEY` only if live flight lookup is wanted and the chosen provider plan supports the required use.
