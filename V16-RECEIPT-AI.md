# Miles & Meals v16 — Receipt Photo + Auto-fill

## New expense workflow

1. Open **Add Expense**.
2. Choose the country.
3. Tap **Take receipt photo**.
4. On a phone, the rear camera can be opened using `capture="environment"`.
5. The photo is sent to the server for AI analysis.
6. Miles & Meals auto-fills:
   - Description = detected merchant/shop name
   - Amount = final receipt total
   - Currency = detected 3-letter currency code when clear
7. The traveler verifies/corrects the detected fields.
8. On Save, the receipt image is uploaded to a private Vercel Blob store.
9. The private Blob URL is saved in the existing `expenses.receipt_url` column.

## AI configuration

Add this server environment variable:

```env
OPENAI_API_KEY="your OpenAI API key"
OPENAI_RECEIPT_MODEL="gpt-5-mini"
```

The API key must never be put in a `NEXT_PUBLIC_...` variable.

## Vercel Blob

Create a **Private** Blob store in the same Vercel project.

Vercel adds:

```env
BLOB_READ_WRITE_TOKEN="..."
```

automatically to connected environments.

For local development, pull Vercel environment variables or copy the Blob
token into the local `.env` file.

## Supported images

- JPEG
- PNG
- WebP
- Maximum app upload size: 12 MB

If an iPhone gallery image is HEIC, use the camera button to take a fresh
receipt photo.

## Safety

Receipt AI is an assistant, not the source of truth. The form intentionally
keeps every detected value editable before Save.

## Database

No Neon schema change is required. `expenses.receipt_url` already exists.

## Install / build

```powershell
npm install
npm test
npm run build
npm run dev
```
