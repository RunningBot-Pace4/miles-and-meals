# Miles & Meals v25 — Mobile Forms + Receipt OCR Upgrade

## Mobile form-control audit

Audited all form controls currently rendered by the project:

- 43 inputs
- 12 dropdown/select controls
- 2 textareas
- 9 TSX files containing form controls

The mobile CSS now standardizes:

- `width: 100%`
- `min-width: 0`
- `max-width: 100%`
- mobile-safe 16px form text
- responsive date/time inputs
- long dropdown values
- one-column form collapse below 720px
- split member rows
- exchange-rate rows
- admin forms
- planner forms
- settlement filters
- live-location country selector
- expense sticky save layout
- very narrow phones below 380px

Date/time controls include WebKit-specific sizing rules so their native value
and picker indicator cannot force the input wider than the phone.

## Receipt OCR v25

Receipt scanning remains free and on-device with Tesseract.js.

The scanner now runs four OCR passes using the same worker:

1. Enhanced full receipt
2. Binary/high-contrast full receipt
3. Header crop for merchant/shop name
4. Bottom crop for final total

The parser compares results across the passes rather than trusting one OCR
result.

### Shop name

Merchant ranking now:

- gives extra weight to repeated results across OCR passes
- gives extra weight to header text
- combines short two-line names such as `HIGHLANDS` + `COFFEE`
- rejects address-like lines more aggressively
- rejects receipt/payment/tax/service-charge noise
- keeps up to five shop-name suggestions for manual correction

### Amount

Total detection now:

- gives extra weight to the bottom receipt crop
- compares totals found by multiple OCR passes
- recognizes common OCR label mistakes such as `T0TAL`
- ignores subtotal, service charge, change, tax and cash-received lines
- handles common thousands/decimal formats
- exposes up to four detected total suggestions for one-tap correction

## Performance

The four OCR passes reuse one Tesseract worker. Receipt images are capped at a
mobile-conscious processing size to avoid excessive memory use.

## Database

No Neon schema change is required.

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run build
npm run dev
```
