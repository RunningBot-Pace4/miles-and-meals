# V93 — Bill-Level Settlements

## What changed

Miles & Meals now supports authoritative payment allocation to individual expense bills.

A settlement remains the money transfer between two travelers. A settlement-expense allocation records exactly which bill(s) that payment settles.

## Example

A owes B:

| Bill | Owed | Payment allocated | Remaining | Status |
| --- | ---: | ---: | ---: | --- |
| Breakfast | RM50 | RM20 | RM30 | PARTIAL |
| Hotel | RM100 | RM50 | RM50 | PARTIAL |
| Dinner | RM30 | RM30 | RM0 | SETTLED |

A can select Breakfast, Hotel, and Dinner in one payment and enter a different amount for each bill.

## Accounting rules

- `settlements` records the actual person-to-person transfer.
- `settlement_expense_allocations` links that transfer to one or more expenses.
- The sum of bill allocations must equal the payment amount.
- A bill allocation cannot exceed that bill's remaining direct obligation.
- A selected-bill payment cannot exceed the current direct balance between the two travelers.
- Existing `SENT` and `SETTLED` payments continue to reduce the person-to-person ledger.
- Smart Settlement stays netted and unallocated. It never claims to settle a specific receipt unless the user explicitly uses the original-bill payment flow.
- Legacy payments created before this feature remain unassigned rather than being guessed onto old bills.
- Expenses with bill-specific payment allocations are locked from normal financial edit/delete operations to preserve the audit trail.

## Database

Preferred deployment:

```bash
npm run db:push
```

For manual SQL deployments:

```text
database/V93-bill-level-settlement-allocations.sql
```

The new table is:

```text
settlement_expense_allocations
- settlement_id
- expense_id
- amount_base
- created_at
```

Primary key: `(settlement_id, expense_id)`.

## Backup / restore

Admin backup format is upgraded to version 4 and now exports/restores settlement-expense allocations. Older backup versions 1–3 remain accepted.

## UI

Under each Original Balance relationship, users can:

1. Open **Pay selected bills**.
2. Select one or more outstanding bills.
3. Enter a full or partial amount for every selected bill.
4. Record the combined payment.

Each bill displays one of:

- `UNPAID`
- `PARTIAL`
- `SETTLED`

The settlement history also displays the bill allocations attached to each payment. Unallocated historical payments are explicitly labeled as unassigned.

## Safety

Bill allocation writes use the same transaction and trip-level lock as the hardened settlement path. The settlement and every selected bill allocation therefore commit or roll back together.
