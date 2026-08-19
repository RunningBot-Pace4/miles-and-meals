# Miles & Meals v34 — PWA Launch Nullability Fix

## Fix

`PwaLaunchDismiss.tsx` now captures the splash element into a stable
non-null `HTMLElement` reference before scheduling timeout callbacks.

The timeout handles are also cleaned up when the component unmounts.

This resolves the production TypeScript build error:

```text
'splash' is possibly 'null'
```

## Validation

- PWA validation passed
- 97 TS/TSX files scanned
- 0 TS syntax/parse errors
- 0 possibly-null diagnostics
- 0 missing local `@/` imports

## Run

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run pwa:check
npm run build
```

No database migration is required.
