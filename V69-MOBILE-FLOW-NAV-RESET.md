# v69 — Mobile Flow, Navigation & Safe Neon Reset

v69 focuses on mobile usability and operational safety on top of v68.

## 1. Context-aware Back button

A compact Back control is shown on secondary mobile screens such as Search, Settle Up, Trip Wrapped, Expenses list/edit, Trips, Notifications, Activity, Export, Settings and Admin subpages.

The five primary tabs remain clean and do **not** show a redundant Back control:

- Home
- Plan
- Add
- Map
- More

The Back control remembers the previous in-app route when possible and otherwise uses a safe fallback. Full-page navigation is retained to stay compatible with the existing navigation reliability workaround.

## 2. Trip Wrapped switches immediately

`Your travel story` no longer requires a separate **View** button.

Changing the Trip dropdown:

1. syncs the selected trip as the active trip;
2. shows a loading overlay;
3. opens that Trip Wrapped view immediately.

## 3. Search keeps the mobile bottom tools visible

Search no longer auto-focuses the search field on page load. On iPhone/PWA this prevents the software keyboard from immediately covering the bottom navigation.

The bottom navigation also receives a stronger fixed stacking layer and safe-area spacing.

## 4. Mobile design-system pass

A v69 mobile-only polish layer standardizes:

- 48–50px primary controls/touch targets;
- 16px form text to prevent iOS input zoom;
- safer phone padding and bottom-nav clearance;
- compact context-aware page headers;
- premium glass bottom navigation;
- improved Search result readability;
- cleaner Trip Wrapped cards and picker;
- stronger sticky Save spacing;
- safe-area behavior from 320px through 430px phone widths.

The existing desktop layout is intentionally preserved.

## 5. Mobile regression coverage

`e2e/mobile-v69-complete-flow.spec.ts` covers the core signed-in flow at:

- 320px
- 375px
- 390px
- 430px

It checks the main user routes for horizontal overflow, visible bottom navigation, primary-vs-secondary Back behavior, Search focus behavior and Trip Wrapped instant selection.

Authenticated E2E tests require `E2E_EMAIL` and `E2E_PASSWORD`.

## 6. Neon reset while keeping user login

Two reset options are included:

- `scripts/neon-reset-keep-login.sql` — paste/run in Neon SQL Editor.
- `RESET_APP_DATA="YES" npm run db:reset:keep-login` — guarded CLI reset.

Preserved:

- `user`
- `account`
- `session`
- `verification`
- `user_preferences`

This preserves user identity, role, password/auth credentials, current sessions and password-change/profile security state.

Cleared:

- trips and memberships
- trip budgets/destinations
- expenses and splits
- settlements
- planner items
- GPS pings
- notifications/activity
- push subscriptions and notification preferences
- login audit history
- product/API metrics and app-error logs

**Create a Neon branch/backup before running the reset. The deleted application data is not recoverable from the reset itself.**

## Database migration

v69 adds no schema fields/tables beyond v67. If the v67 schema was already applied, no new `db:push` is required for v68/v69.
