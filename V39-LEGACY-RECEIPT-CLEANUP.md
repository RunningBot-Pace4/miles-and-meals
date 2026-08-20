# Miles & Meals v39 — Legacy Receipt Analyze Cleanup

## Root cause

The failing route:

```text
src/app/api/receipts/analyze/route.ts
```

is not part of the current Miles & Meals source.

Receipt OCR runs in the browser in the current app, so the old server analyze
route is obsolete. It remained in an older project folder after source overlays.

## Fix

`cleanup-legacy-files.mjs` now removes:

```text
src/app/api/receipts/upload
src/app/api/receipts/analyze
src/lib/receipt-storage.ts
src/components/ForgotPasswordForm.tsx
src/components/ResetPasswordForm.tsx
src/app/reset-password
```

`npm run phase8:check` now runs the legacy cleanup itself before validating
mutation routes.

## Exact regression test

A fake unguarded `src/app/api/receipts/analyze/route.ts` was added to the
v39 project and then:

```powershell
npm run phase8:check
```

was executed.

Result:

```text
Removed legacy file: src/app/api/receipts/analyze
Phase 8 validation passed.
```

## Validation

```text
PWA: PASS
Navigation: PASS
Phase 8: PASS
Service worker syntax: PASS
Cleanup syntax: PASS
121 TS/TSX files
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports
```

## Upgrade

Replace the old project folder rather than extracting over it.

Then run:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run cleanup:legacy
npm run phase8:check
npm test
npm run build
```

No additional database migration is required beyond the Phase 8 v38 tables.
If v38 `npm run db:push` has not been run yet, run it once.
