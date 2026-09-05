# Miles & Meals v37 — Stale Password UI Cleanup

## Root cause

The failing files were not part of the current v36 source package:

```text
src/components/ForgotPasswordForm.tsx
src/components/ResetPasswordForm.tsx
```

They were legacy files left behind when a newer source package was extracted
over an older project folder.

The current Miles & Meals password recovery flow is admin-assisted and uses:

```text
src/app/forgot-password/page.tsx
```

It does not use the two legacy form components or `/reset-password`.

## Fix

`scripts/cleanup-legacy-files.mjs` now removes:

```text
src/components/ForgotPasswordForm.tsx
src/components/ResetPasswordForm.tsx
src/app/reset-password
```

`npm run navigation:check` now runs `cleanup:legacy` before validating source,
so the exact stale-overlay problem cannot block the build again.

## Validation

A simulated stale project was created with the two failing `next/link` files
plus a legacy reset-password route.

Running:

```powershell
npm run navigation:check
```

removed all three stale paths and passed validation.

Final checks:

```text
Navigation validation: PASS
PWA validation: PASS
102 TS/TSX files
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports
```

## Run

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run navigation:check
npm test
npm run build
```

No database migration is required.
