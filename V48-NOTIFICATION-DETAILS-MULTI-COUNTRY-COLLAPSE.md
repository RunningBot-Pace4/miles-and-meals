# Miles & Meals v48 — Notification Details + Multi-Country Trip Owner

## 1. Notification detail-first interaction

The Notification Center no longer navigates immediately when a notification is
opened.

New flow:

```text
Notification bell
→ Notification Center
→ Tap notification
→ Detail dialog / mobile bottom sheet
→ Optional Open related screen
```

Opening the detail view marks the notification as read.

The detail view contains:

- notification category
- title
- full message
- notification time
- read status
- Close
- Open related screen

Desktop uses a centered dialog.

Mobile uses a bottom sheet so the interaction feels native and does not force
the traveler away from the Notification Center.

Pressing Escape or tapping the backdrop closes the detail view.

## 2. Multi-country Trip Owner setup

A Trip Owner can now prepare multiple destination countries before saving.

New flow:

```text
Add destination countries
→ choose Vietnam
→ confirm/edit FX
→ Add to list
→ choose Thailand
→ confirm/edit FX
→ Add to list
→ choose Japan
→ confirm/edit FX
→ Add to list
→ Add 3 countries
```

Queued countries display:

- country
- local currency
- trip base currency
- editable FX
- Remove action

Countries already in the trip or already queued are removed from the available
country dropdown.

The server bulk route validates:

- Trip Owner permission
- valid country catalog codes
- one country only once per batch
- countries not already configured on the trip
- positive FX values
- maximum 20 countries per batch

The trip creator is automatically assigned to every newly added destination.

## 3. Destination cards collapsed by default

Trip Owner destination cards are no longer forced open.

Compact state:

```text
Malaysia
MYR → MYR · FX 1.0000000000
1 traveler · Manage
```

Tap the card to expand:

```text
Default FX
Traveler assignment
```

This keeps trips with many countries short and easy to scan.

## 4. Existing protections retained

v48 retains:

- non-admin email privacy
- global numeric-input protection
- personal budgets
- combined budgets
- Trip Owner access boundaries
- settlement in-place refresh
- expense/planner live refresh
- draft recovery
- notification unread badge
- full travel backup/restore

## Database

No v48 database migration is required.

If the v46 `trip_budgets` migration has already been pushed, do not run a new
migration for v48.

If upgrading from before v46:

```powershell
npm run db:push
```

Never run `db:reset` for an upgrade.

## Validation

```text
PWA validation                    PASS
Navigation validation             PASS
Phase 8 / v48                     PASS
Service worker syntax             PASS
Validator syntax                  PASS

172 TS/TSX files
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports

Numeric regression                PASS
Budget regression                 PASS
Trip Owner regression             PASS
Settlement regression             PASS
Receipt OCR regression            PASS
Non-admin email privacy           PASS
Notification detail dialog        PASS
Multi-country queue               PASS
Country cards collapsed           PASS
```

A full Next production build requires installed dependencies.

Recommended local validation:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

npm install
npm run cleanup:legacy
npm run pwa:check
npm run navigation:check
npm run phase8:check
npm test
npm run build
```
