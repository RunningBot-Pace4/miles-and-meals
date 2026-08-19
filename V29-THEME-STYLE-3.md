# Miles & Meals v29 — Style 3 Theme Refresh

## What changed
- Kept the existing layout and navigation.
- Applied the Style 3 mixed-card direction.
- Updated the full app to a warm travel theme.

## Theme direction
- Primary: lagoon teal
- Accent: sunset amber
- Surface: warm ivory / sand
- Support: seafoam, sky mist, soft coral

## UI updates
- Lighter app background with soft travel pattern.
- Glassy warm header and bottom navigation.
- Ticket-style dashboard hero.
- Soft colorful summary cards.
- Rounded action/list/admin/form cards.
- Improved global buttons, borders, inputs and loading overlay.

## Files changed
- src/app/globals.css
- src/app/layout.tsx
- public/manifest.webmanifest

## Run
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run build
npm run dev
```
