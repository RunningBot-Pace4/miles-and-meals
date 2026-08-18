# Miles & Meals v20 — Receipt Build Cleanup

## Fixed

The old Vercel Blob upload route was still present in some v19 source copies:

```text
src/app/api/receipts/upload/route.ts
```

That route imported:

```text
@vercel/blob
```

even though the dependency had already been removed from `package.json`.

v20 removes all Vercel Blob receipt code completely.

Verified absent:

- `@vercel/blob`
- `BLOB_READ_WRITE_TOKEN`
- `/api/receipts/upload`
- `deleteStoredReceipt`

Receipt OCR remains browser-side with Tesseract.js.

Receipt photos remain compressed in the browser and stored in the existing
Neon `expenses.receipt_url` text field.

## Database

No schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
