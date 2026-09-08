# Financial Concurrency Hardening

## Scope

This patch hardens the financial write path without changing the accounting formulas or requiring a database migration.

### Protected operations

All critical operations serialize on the owning `trips` row with PostgreSQL `FOR UPDATE` inside an interactive transaction:

- expense create
- expense edit
- expense delete
- receipt-review mutation
- settlement create/confirm
- financial close
- financial reopen

Expense mutations additionally require the trip financial state to remain `OPEN`.

Settlement mutations remain available after financial close so travelers can still record and confirm payments against a frozen expense ledger.

## Files changed

- `src/db/transaction.ts`
- `src/lib/expense-idempotency.ts`
- `src/app/api/expenses/route.ts`
- `src/app/api/expenses/[id]/route.ts`
- `src/app/api/expenses/[id]/receipt-review/route.ts`
- `src/lib/validation.ts`
- `src/components/SettlementActionButton.tsx`
- `src/app/api/settlements/route.ts`
- `src/lib/financial-close.ts`

## Tests added

- `tests/expense-idempotency.test.ts`
- `tests/financial-concurrency-contract.test.ts`
- `tests/financial-concurrency.integration.test.ts`
- `e2e/financial-concurrency.spec.ts`

## Behavioral guarantees

### Expense writes

An expense and all derived rows are written atomically. A failed transaction cannot leave a parent expense without its splits, payer allocations, item rows, or item assignments.

`clientRequestId` remains the expense idempotency key. Reusing the same UUID with different financial content returns:

```text
409 REQUEST_ID_CONFLICT
```

A matching legacy request that has incomplete derived rows can be repaired atomically.

Expense edits use a compare-and-swap update based on `updatedAt`. Two editors starting from the same version cannot both commit.

### Settlement writes

The client sends a stable `requestId` UUID for a payment action and reuses it only when the network outcome is unknown.

Concurrent requests for the same payment serialize on the trip lock. Retrying the same UUID and same financial action returns the existing settlement. Reusing the UUID for different content returns:

```text
409 REQUEST_ID_CONFLICT
```

### Financial close

Close locks the trip before checking expense integrity and generating the snapshot. Expense mutations use the same lock, so close and expense writes cannot pass each other.

Before close, every expense must have:

- at least one split row
- at least one payer row
- split cents that reconcile to the settlement amount
- payer cents that reconcile to the settlement amount

## Running tests

### Unit and contract tests

```bash
npx vitest run \
  tests/expense-idempotency.test.ts \
  tests/financial-concurrency-contract.test.ts
```

### Real PostgreSQL concurrency tests

Use a disposable PostgreSQL/Neon database:

```bash
TEST_DATABASE_URL='postgresql://...' \
  npx vitest run tests/financial-concurrency.integration.test.ts
```

The integration suite creates and removes its own fixture rows.

### API/Playwright race tests

Use a disposable, otherwise-empty trip with one country and two travelers:

```bash
E2E_FINANCIAL_OWNER_EMAIL='owner@example.test' \
E2E_FINANCIAL_OWNER_PASSWORD='...' \
E2E_FINANCIAL_OWNER_USER_ID='...' \
E2E_FINANCIAL_RECEIVER_USER_ID='...' \
E2E_FINANCIAL_COUNTRY_ID='...' \
E2E_FINANCIAL_TRIP_ID='...' \
  npx playwright test e2e/financial-concurrency.spec.ts \
    --project=desktop-chrome --workers=1
```

The suite is intentionally serial and skips non-desktop-Chrome projects because it mutates one shared disposable trip.

## Verification notes

The source-package release validators should still be run as part of the normal release gate:

```bash
npm run release:check
```

The PostgreSQL and Playwright race suites are separate because they require disposable external fixtures.
