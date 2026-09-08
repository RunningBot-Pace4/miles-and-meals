# V94 — Payment Reversal + Audit-Safe Bill Restoration

V94 extends the V93 bill-level settlement model with safe correction handling.

## Payment lifecycle

- `SENT`: payer recorded payment; it reduces outstanding balances immediately.
- `SETTLED`: receiver confirmed the payment.
- `CANCELLED`: a previously `SENT` payment was cancelled before confirmation.
- `REVERSED`: a previously `SETTLED` payment was reversed after confirmation.

Only `SENT` and `SETTLED` are active financial movements. `CANCELLED` and
`REVERSED` remain in history but no longer reduce person balances or bill-level
outstanding amounts.

## Authorization

- A payer may cancel their own `SENT` payment.
- A receiver may reverse a `SETTLED` payment they received.
- A Trip Owner or system admin may cancel/reverse either active state.
- A payer cannot unilaterally reverse a receiver-confirmed payment.
- Reversing a confirmed payment requires a short reason.

## Bill restoration

Settlement allocations are retained after cancellation/reversal for audit.
The settlement ledger only applies allocations whose parent settlement is
`SENT` or `SETTLED`. Therefore reversing an RM20 allocation against a RM50
Breakfast bill changes the live bill from:

`RM50 owed → RM20 paid → RM30 remaining`

back to:

`RM50 owed → RM0 active paid → RM50 remaining`.

The historical payment still shows that RM20 had previously been allocated to
Breakfast and records who reversed it, when, and why.

## Database

V94 adds nullable audit fields to `settlements`:

- `reversed_by`
- `reversed_at`
- `reversal_reason`

Run:

```bash
npm run db:push
```

or apply:

`database/V94-payment-reversal-audit.sql`

V93's `settlement_expense_allocations` table is still required.

## Backup

Travel backup format is now version 5. Versions 1–4 remain accepted for
restore. V5 preserves reversal actor, timestamp, reason, and bill allocations.

## UI

Settlement → Smart Settlement → History now shows:

- sent / confirmed / cancelled / reversed state,
- bill allocations,
- reversal actor/date/reason,
- Cancel payment for eligible `SENT` records,
- Reverse payment for eligible `SETTLED` records.

Reversal uses a two-step confirmation UI. Confirmed payment reversal requires
a reason.
