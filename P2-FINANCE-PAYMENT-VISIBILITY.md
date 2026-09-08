# P2 Finance + Payment Visibility Hardening

## Scope

This patch builds on the v1.92.21 financial-concurrency hardening package.

### P2 fixes

- Expense-list API no longer returns `receiptUrl`, preventing embedded base64 receipt images from bloating list responses.
- Expense dates are validated as real calendar dates rather than only `YYYY-MM-DD` shaped strings.
- Expense currency codes must contain exactly three letters.
- External receipt links are restricted to HTTP(S).
- Expense split arrays are capped at 30 travelers.
- Settlement ledger groups payer rows by expense once instead of filtering all payer rows for every split.
- Offline expense amount editing is blocked when changing the amount would invalidate exact, itemized, multi-payer, or actual-card-charge allocations.

### Payment visibility

The Original Balances audit now shows, for each direct traveler relationship:

- Original owed
- Direct payments recorded
- Direct remaining

This makes a simple partial payment explicit. Example:

- A owes B RM50
- A records RM20 paid
- Direct remaining shows RM30

## Important bill-level limitation

Settlement records are person-to-person records. They do not currently reference an individual expense obligation. When A owes B across Breakfast, Hotel, and Dinner, the system can authoritatively calculate the total A→B direct remaining amount, but it cannot truthfully state which receipt consumed a partial payment.

Do not infer receipt-level status silently.

A future bill-level settlement feature should store explicit allocation rows such as:

- settlementId
- expenseId
- debtorUserId
- creditorUserId
- amountBase

Then a payment can be allocated to one or more bills and the UI can safely show `UNPAID`, `PARTIAL`, or `SETTLED` per expense.

## Verification

- 50 existing `scripts/validate-*.mjs` release validators pass.
- Modified TypeScript/TSX files were parsed with TypeScript's compiler API with no syntax errors.
- Full dependency-backed typecheck/Vitest/Playwright execution was not run because this source package does not include `node_modules`.
