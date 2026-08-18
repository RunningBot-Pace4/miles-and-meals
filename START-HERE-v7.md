# Miles & Meals v7

## Main fixes

- Responsive mobile/tablet/desktop navigation.
- Desktop sidebar no longer inherits the five-column mobile grid.
- More visual dashboard and Admin onboarding when no countries exist.
- Top-right avatar menu with Change Password, Admin Console and Sign Out.
- New `/settings/password` page.
- Fixed `Cannot read properties of null (reading 'reset')` by storing the form
  element before awaited requests.
- Applied the same reset fix to Planner item creation.
- Added button loading states to Admin forms.
- Added branded root loading screen.
- Added authenticated route skeleton loading screen.

## Run

```powershell
npm install
npm run db:push
npm run build
npm run dev
```

No database migration is required specifically for v7 if the v6 schema is
already present.
