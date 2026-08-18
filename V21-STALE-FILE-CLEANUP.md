# Miles & Meals v21 — Stale File Build Protection

## Why the `@vercel/blob` error could still appear

The corrected source no longer contains:

```text
src/app/api/receipts/upload/route.ts
```

However, extracting a newer ZIP over an older project does not delete files
that disappeared from the new version.

That means an old copy of:

```text
src/app/api/receipts/upload/route.ts
```

can remain in the local repository and later be pushed to GitHub/Vercel.

## v21 protection

Before both:

```text
npm run dev
npm run build
```

Miles & Meals now automatically removes these obsolete paths:

```text
src/app/api/receipts/upload
src/lib/receipt-storage.ts
```

using:

```text
scripts/cleanup-legacy-files.mjs
```

You should still delete the stale files from GitHub permanently, but they can
no longer break the build if they accidentally remain in an overlaid project.

No Neon schema change is required.
