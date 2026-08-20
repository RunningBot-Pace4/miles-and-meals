# Miles & Meals v45 — Free Enhancement Pack

v45 focuses on live collaboration, data protection, notification reliability
and Admin safety without adding a paid service.

## 1. Live collaboration without page reloads

### Settlements

Retains the v44 in-place settlement behavior:

- Mark Paid updates only the settlement workspace
- Confirm Received updates only the settlement workspace
- 4-second live polling for the other traveler
- no document reload

### Expenses

The Expenses page now uses `LiveExpensesWorkspace`:

- 8-second in-place polling
- focus / reconnect refresh
- delete updates in place
- totals and personal share update in place
- no background document reload

### Planner

Planner now keeps its own live `itemsState`:

- 8-second in-place polling
- focus / reconnect refresh
- add / edit / delete update the planner list in place
- no background document reload

### Home

Home spending cards and category totals now use `LiveDashboardFinance`:

- Spent
- Budget
- Remaining
- By category

These update in place instead of relying on a full-page refresh.

## 2. Expense and Planner draft recovery

Drafts are stored locally on the current device.

### Expense

If an unfinished expense exists:

```text
Unsaved expense found

[ Restore draft ]  [ Discard ]
```

Stored fields include the expense details, FX, payer and split configuration.

A newly selected receipt photo cannot be safely persisted in localStorage, so
the user is reminded to reattach that unsaved photo. A receipt that was already
stored on an existing expense is preserved.

### Planner

New and edit forms have local draft recovery:

```text
Unsaved planner draft found

[ Restore ]  [ Discard ]
```

Drafts are cleared only after a successful save.

## 3. Push test + Notification Center

Since VAPID Web Push is already configured, users can now go to:

```text
More
→ Notification settings
→ Send test notification
```

The server sends a direct test push to the account's active subscriptions.

New:

```text
More
→ Notification center
```

The inbox stores enabled Payment, Expense and Planner notifications in Neon.

Features:

- unread count
- mark one read
- mark all read
- open destination
- refresh while the page is active

Notification preferences control both Web Push and in-app notification history.

## 4. Admin account safety

Travel Crew now supports:

- Disable user
- Reactivate user
- immediate session revocation when disabled
- protection against disabling your own Admin account

The existing Better Auth Admin `banned` fields are used rather than deleting
accounts.

Country access also adds:

```text
Select all
Clear all
```

Individual country checkboxes remain available.

## 5. Full travel backup + controlled restore

New:

```text
More
→ Admin: backup & restore
```

### Download backup

Includes:

- trips
- trip memberships
- countries
- country assignments
- expenses
- expense splits
- settlements
- planner items

It deliberately excludes login/account data.

### Restore

Restore is intentionally multi-step:

1. choose a JSON backup
2. preview and validate it
3. review counts, warnings and errors
4. type `RESTORE TRAVEL DATA`
5. confirm replacement

Restore replaces travel data in one Neon transaction.

It never imports, deletes or overwrites:

- `user`
- `session`
- `account`
- `verification`
- `login_audits`
- user preferences
- notification preferences
- push subscriptions

## 6. Database consistency checker

Admin Health now checks:

- expense trip vs country trip
- settlement trip vs country trip
- expenses without splits
- split totals that do not equal the settlement amount
- country assignment without trip membership
- duplicate trip names

Problems are displayed in Admin Health without automatically changing data.

## 7. Free performance diagnostics

No Sentry or paid monitoring service is added.

Miles & Meals records lightweight timing samples in Neon for live APIs:

- settlement summary
- expenses live
- planner live
- dashboard finance

Admin Health shows:

- samples
- average response time
- P95
- requests ≥1.5 seconds
- slowest routes

## 8. Better receipt OCR confidence

Receipt scanning now shows separate confidence badges for:

- Shop
- Total
- Overall OCR

Low-confidence values remain editable before save.

## 9. Automated reliability

Added optional Playwright two-user settlement test:

- payer signs in separately
- receiver signs in separately
- Mark Paid
- receiver automatically sees Confirm Received
- Confirm Received
- asserts no page navigation/reload occurred

The existing unit regression still covers:

```text
Huahua → JY RM45 already paid
expense edited
Test → JY RM90
JY → Huahua RM45 refund
```

## 10. Predictable Vercel runtime

Node is pinned to:

```json
"engines": {
  "node": "22.x"
}
```

This avoids automatically jumping to a future Node major release.

## Database migration required

v45 adds:

```text
notifications
api_metrics
```

Run once:

```powershell
npm run db:push
```

Do not use `db:reset`.

## Validate and build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

npm install
npm run db:push
npm run cleanup:legacy
npm run pwa:check
npm run navigation:check
npm run phase8:check
npm test
npm run build
```

Optional Playwright:

```powershell
npm run test:e2e:install
npm run test:e2e
```

For the two-user settlement fixture, optionally set:

```text
E2E_PAYER_EMAIL
E2E_PAYER_PASSWORD
E2E_RECEIVER_EMAIL
E2E_RECEIVER_PASSWORD
E2E_COUNTRY_ID
```

## Validation completed in the artifact environment

```text
PWA validation: PASS
Navigation validation: PASS
Phase 8 / v45 validation: PASS
Service worker syntax: PASS
Phase 8 validator syntax: PASS

146 TS/TSX files scanned
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports
0 background live-workspace reloads

Settlement edit-after-payment pure regression: PASS
Receipt field-confidence pure regression: PASS
```

A full Next production build still needs installed project dependencies, so run
`npm install`, `npm test` and `npm run build` locally/Vercel before deployment.
