# Miles & Meals v31 — Colorful One-Line Headings

## Changes

- Home trip title now uses Trip Name as the main heading.
- Desktop trip title stays on one line when space is available.
- Trip title uses a travel gradient:
  - lagoon teal
  - sea green
  - coral
  - warm amber
- `Welcome back, <name>.` uses the same colorful travel gradient.
- The existing second welcome line keeps a complementary gradient.
- Mobile can still wrap naturally on narrow screens.

## Database

No database schema change is required.

## Run

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run build
npm run dev
```
