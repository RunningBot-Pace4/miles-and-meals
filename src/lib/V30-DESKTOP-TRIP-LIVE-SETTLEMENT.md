# Miles & Meals v30 — Desktop Layout, Trip Labels, Live Settlement Status

## 1. Desktop Home layout repair

v29 added a late global `.page-container` and `.mobile-nav` theme override.

On desktop that override removed the reserved left content padding and also
reintroduced `right` + `bottom` on the fixed sidebar. Because `top` was still
set by the desktop rules, the sidebar stretched vertically and covered the
Home content.

v30 restores a desktop-only shell after all theme overrides:

- Sidebar is 194px wide.
- Sidebar has `top` but no `bottom`, so it no longer stretches.
- Main content reserves 238px on the left.
- Home text and cards cannot sit underneath the sidebar.
- The warm travel hero gets stronger text contrast for spend/budget labels.

## 2. Home selector

The Home selector now displays only the trip name.

Example:

```text
All trips
Vietnam 2026 (Working Trip)
Japan 2026
```

The country name is no longer appended to the option label.

The Settle Up filter also uses Trip / All trips wording for consistency.

## 3. Settlement live updates

The Settle Up page now refreshes settlement data automatically every 4 seconds
while the tab is visible.

It also refreshes immediately when:

- the browser window receives focus
- the tab becomes visible again

The Home dashboard refreshes settlement/balance data every 6 seconds while
open.

This means the receiving traveler does not need to manually refresh after the
payer clicks Mark paid. The status should appear within a few seconds.

The refresh pauses while a blocking save/action overlay is active.

## Database

No database schema change is required for v30.

## Run

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run build
npm run dev
```

Do not reset the database.
