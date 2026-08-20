# Miles & Meals v41 — Scroll, Profile Name & User Type Fixes

## 1. Scrolling restored

The Phase 8 pull-to-refresh used a global action-loading flag that could leave
the page in a frozen state if a reload was interrupted.

v41 changes the behavior:

- normal vertical scrolling stays native
- horizontal gestures stay native
- pull-to-refresh activates only after a deliberate downward pull from the top
- inputs, selects, buttons, editable areas and nested scroll containers are ignored
- pull-to-refresh no longer sets the global action-loading flag
- global CSS no longer freezes the page from a stale action-loading flag
- SavingOverlay still locks scrolling only while a real blocking save overlay is mounted

## 2. User Name can be changed from Profile

Path:

```text
More → Profile & avatar
```

Profile now includes:

- User name
- Avatar
- Avatar color

Changing User Name updates the existing Better Auth `user.name` record.
Login email and password are unchanged.

## 3. Admin can assign user type

Supported types:

- Traveler
- Admin

Admin can choose the type while creating a new person.

For existing users:

```text
Admin → Travel Crew → open a user → Change user type
```

Traveler access follows assigned countries.

Admin gets Admin tools and system-wide destination access.

The signed-in Admin cannot demote their own account from this screen, preventing
accidental loss of Admin access.

## Validation

```text
PWA: PASS
Navigation: PASS
Phase 8 / v41: PASS
Service worker syntax: PASS
122 TS/TSX files
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports
0 v41 non-module diagnostics
```

## Database

No schema migration is required for v41.

## Upgrade

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run cleanup:legacy
npm run phase8:check
npm test
npm run build
```
