# Miles & Meals v11 — Edit Expense Actual Card Charge Fix

## Fixed

Older expenses could contain `actualConvertedAmount = 0.00` from an earlier
version. When those expenses were edited, the optional Actual Card Charge field
loaded `0.00` and the form displayed:

`Enter a valid actual card charge or leave it blank.`

v11 normalizes legacy zero values to blank in three places:

- Edit-page server data
- Expense form initial state
- Expense API validation

Positive actual card charges continue to work normally.

## Database

No schema change is required.

Run:

```powershell
npm install
npm test
npm run build
npm run dev
```
