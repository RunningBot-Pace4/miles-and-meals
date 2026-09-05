# Miles & Meals v38 — Phase 8 Free Edition

Phase 8 uses only the existing Vercel + Neon deployment and open web standards.
No Firebase, OneSignal, Sentry, Pusher, Ably or other paid service is required.

## 8.1 Mobile experience

### Pull to refresh

On a touch device, when the page is already at the top:

1. Pull downward.
2. `Pull to refresh` appears.
3. Pull far enough to see `Release to refresh`.
4. Release to perform a normal full-page refresh.

Refresh is blocked when:

- the device is offline
- a blocking save/loading action is running
- a form contains unsaved changes

### Connection status

- Offline: persistent `You're offline` banner
- Reconnected: temporary `Connection restored` confirmation
- Offline form submissions are blocked before data can be lost

## 8.2 Live shared-data sync

The existing settlement behavior remains automatic.

- Settle Up: polls every 4 seconds, same user-facing behavior as before
- Dashboard: checks every 8 seconds
- Expenses: checks every 8 seconds
- Planner: checks every 8 seconds

The live endpoint uses one PostgreSQL `DISTINCT ON` query against the Phase 8
activity log and returns three lightweight version tokens:

- settlement
- expense
- planner

A full page reload happens only when the relevant shared version changes.

This means create, edit and delete are all detected, including deletion of an
older record.

## 8.3 PWA update flow

When a newer service worker is installed, Miles & Meals shows:

`Miles & Meals update ready → Update`

The existing Home Screen app does not need to be deleted/reinstalled for normal
updates.

## 8.4 Free Web Push

Web Push uses the open Web Push protocol, VAPID keys and the `web-push` Node
library. Push subscriptions are stored in Neon.

Notifications are available for:

- Payment marked paid / payment confirmed / received
- Expense created / updated / removed
- Planner item created / updated / removed

Users can enable/disable categories at:

`More → Notifications`

### One-time setup

After installing dependencies:

```powershell
npm run push:keys
```

Copy the generated values into `.env.local` and Vercel:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
```

Generate the VAPID key pair once and keep it stable. Changing the key pair
requires devices to subscribe again.

On iPhone/iPad, Web Push should be enabled from the installed Home Screen web
app rather than relying on a normal Safari tab.

## 8.5 Activity history

`More → Trip activity`

Records important actions for:

- expenses
- planner
- settlements
- Admin user creation
- Admin password reset
- trip creation
- country creation
- country assignments

Normal travelers only see activity they are allowed to access. Admins see all
activity.

## 8.6 Export and diagnostics

### Export

`More → Export trip data`

Downloads:

- JSON structured backup
- CSV flattened export

Only accessible countries are included.

### Admin health

`More → Admin: app health`

Shows:

- Neon database status
- authenticated Admin status
- PWA validation status
- Web Push configuration status
- latest authenticated client error reports

Client error reports are stored in Neon. No external monitoring provider is
used.

## 8.7 Security and automated tests

All application mutation Route Handlers now reject explicit cross-site
requests and validate same-origin requests when an Origin header is present.

Playwright projects are included for:

- Android-style mobile Chrome
- Mobile Safari
- Desktop Chrome

Commands:

```powershell
npm run test:e2e:install
npm run test:e2e
```

Authenticated E2E checks are optional:

```text
E2E_EMAIL=...
E2E_PASSWORD=...
```

## Database upgrade required

v38 adds these tables:

- `notification_preferences`
- `push_subscriptions`
- `activity_logs`
- `app_errors`

Run once against the target Neon database:

```powershell
npm run db:push
```

Do not reset the database.

## Validation

```powershell
npm run pwa:check
npm run navigation:check
npm run phase8:check
npm test
npm run build
```
