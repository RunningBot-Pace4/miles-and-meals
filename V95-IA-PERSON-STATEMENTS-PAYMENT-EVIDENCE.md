# V95 — Information Architecture, Person Statements & Payment Evidence

## Scope

V95 keeps the V94 accounting model and consolidates how users reach it.

### Navigation

Mobile navigation is now:

- Home
- Plan
- Add
- Spend
- More

`Add` opens a focused capture hub for Expense, Plan item, Memory or Document. The Plan-item shortcut opens the planner directly in add mode.

`Spend` owns Expenses, Settle Up, Budgets and Receipt Review. Map remains available through the Home/Move experience and More → Trip.

`More` is grouped into Trip, Story & Updates, App & Account, and an intentionally collapsed Advanced section. Memories + Trip Wrapped are presented through Trip Story. Notifications + Activity are presented through Updates.

### Person Statement

Every direct original balance can open a Person Statement:

`/settlements/statement?countryId=...&fromUserId=...&toUserId=...`

The statement shows:

- original direct bills
- active direct payments
- bill-specific allocated payments
- direct outstanding balance
- unassigned direct-payment disclosure
- per-bill UNPAID / PARTIAL / SETTLED state
- payment history and bill allocations
- payment method/reference/note/proof
- bill-selection payment controls

Smart Settlement remains separate and does not invent bill allocations.

### Payment evidence

Settlements can now optionally store:

- payment method
- transfer/reference number
- payment note
- compressed JPEG payment proof

Supported methods:

- Cash
- DuitNow
- Bank transfer
- Touch 'n Go
- Card
- Other

Proof images are served only through an authenticated country-access checked endpoint and are not included in the normal settlement-list payload.

### Database

Apply:

```bash
npm run db:push
```

or:

```text
database/V95-payment-evidence-person-statements.sql
```

Backup format is now v6. Versions 1–5 remain accepted for restore.

### Deployment order

1. Deploy database migration.
2. Deploy application.
3. Run `npm run v95:check`.
4. Run the normal release gate when dependencies are installed.

### Additional correctness fix

Display-currency conversion now scales bill-level allocated-paid, remaining and payment-allocation amounts together with the settlement total. This prevents mixed-currency UI from showing internally inconsistent bill totals.

### Accounting invariants

V95 does not alter settlement amounts, bill allocations, reversal behavior, or trip-level financial locks. Payment evidence is metadata attached to an existing settlement transaction.
