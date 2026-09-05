# Miles & Meals v19 — Better Shop Detection + Neon Receipt Storage

## Shop name detection

Receipt OCR now performs two passes:

1. Full receipt — used primarily for totals/currency.
2. Top 38% receipt header — used primarily for merchant/shop name.

Merchant detection also filters address, tax, invoice, payment, terminal and
receipt noise more aggressively.

Up to four likely shop names are shown as tappable suggestions. Selecting one
immediately updates Description.

## Removed UI text

Removed:

- `Local OCR is free but less accurate than an AI vision model...`
- `<currency> is the trip base currency, so the rate is fixed at 1:1.`

The base-currency rate still remains correctly locked at 1.

## Receipt photo storage

Vercel Blob has been removed.

A receipt photo is now:

1. Compressed in the browser.
2. Converted to JPEG.
3. Limited to about 600 KB.
4. Saved as a data URL in the existing `expenses.receipt_url` Neon text field.

No separate receipt-storage service or storage API key is required.

This uses the project's existing Neon database storage allocation and is not
unlimited storage.

Existing normal receipt URLs remain supported.

## Database

No schema change is required because `receipt_url` is already a PostgreSQL
`text` column.

```powershell
npm install
npm test
npm run build
npm run dev
```
