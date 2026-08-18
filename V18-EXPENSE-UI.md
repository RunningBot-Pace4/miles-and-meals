# Miles & Meals v18 — Receipt Shortcut + Base Currency 1:1

## Receipt scanner

`Scan receipt` is no longer numbered as expense step 4.

It now sits directly beside:

- `Add a spend`
- `Edit expense`

on desktop, and directly below the title on small mobile screens.

After a photo is selected, the receipt preview/OCR result appears as a compact
unnumbered panel before expense step 1.

The numbered expense flow is now:

1. What did you spend?
2. Exchange rate
3. Who paid & who shares?
4. Payment details

## MYR / base-currency exchange rate

If the transaction currency matches the trip base currency:

```text
MYR -> MYR
```

Miles & Meals automatically sets:

```text
Exchange rate = 1
Rate type = Default
```

and locks the rate input.

If the user changes back to a foreign currency, the country's default exchange
rate is restored and can be edited again.

The same rule is enforced in the expense POST/PUT API, not only in the UI.

## Database

No Neon schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
