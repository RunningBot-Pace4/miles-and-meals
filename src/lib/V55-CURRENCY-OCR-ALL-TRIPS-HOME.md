# Miles & Meals v55 — Currency Choice + Receipt OCR + All Trips Home

## 1. Optional transaction currency on Add Expense

A new expense still defaults to the currency configured for the selected trip.
The Currency field is now a dropdown, so a traveler can choose a different
transaction currency when needed.

Rules:

- trip destination currency remains the default
- trip base currency uses a 1:1 rate
- choosing the configured trip currency uses the saved trip default FX rate
- choosing another currency requests the existing free daily FX reference rate
- Cash, Card and Manual rate overrides remain available
- if the FX service is unavailable/offline, the form switches to Manual rate entry

Historical expenses continue storing their own transaction currency and rate.

## 2. Receipt OCR accuracy improvements

Receipt OCR remains local in the browser and free. v55 improves it with:

- higher-resolution receipt preparation
- enhanced and binary full-receipt passes
- dedicated shop-header OCR
- two separate bottom/total-area passes
- total detection when `TOTAL` and its amount are on different OCR lines
- repeated-result consensus scoring
- safer unlabeled-total fallback that avoids plain receipt/order numbers
- merchant and total candidate buttons remain available for manual correction

OCR can never be guaranteed for blurry, folded, reflective or badly cropped
receipts, so detected values remain editable and should be reviewed before save.

## 3. All Trips overview on Home

Home keeps one active trip so Planner, Add Expense and the rest of the app still
have a clear trip context.

When a traveler has more than one accessible trip, Home now also shows an
`All Trips` overview containing each trip's:

- trip name
- destination
- dates
- personal share spent
- personal budget
- total trip spend
- traveler count

Selecting `Open this trip` makes that trip the global active trip and refreshes
Home. Planner and Add Expense continue following the active trip by default.

## Database

No database migration is required from v54 to v55.
