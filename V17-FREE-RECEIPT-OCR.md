# Miles & Meals v17 — Free Receipt OCR

## No OpenAI API key

Receipt text recognition now runs in the user's browser with Tesseract.js.

Remove these Vercel environment variables if you added them only for receipts:

```text
OPENAI_API_KEY
OPENAI_RECEIPT_MODEL
```

## Workflow

1. Add Expense.
2. Choose the country.
3. Tap **Take receipt photo**.
4. Tesseract.js reads the receipt locally in the browser.
5. Miles & Meals applies local parsing rules to find:
   - Merchant/shop name
   - Final total
   - Currency when printed, otherwise the selected country currency
6. Description and Amount are auto-filled.
7. Verify/correct the fields.
8. Save.

## First scan

Tesseract.js runs with WebAssembly and a browser web worker. The first scan can
take longer because the OCR engine/language data may need to download and cache.

## Accuracy

This no-API implementation is free but can be less reliable on:

- Crumpled receipts
- Faint thermal printing
- Strong glare/shadows
- Handwriting
- Complex multilingual layouts

The form shows the detected raw text for troubleshooting and keeps all
auto-filled values editable.

## Receipt image storage

OCR itself requires no key.

If you want the original receipt image retained after saving, keep the existing
private Vercel Blob integration. That is separate from OCR.

## Database

No Neon schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
