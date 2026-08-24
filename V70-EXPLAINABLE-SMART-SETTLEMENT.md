# v70 — Explainable Smart Settlement

v70 makes Smart Settlement auditable without changing the existing repayment ledger or settlement actions.

## What changed

- Every recommended Smart Settlement transfer now has **View details**.
- The drill-down shows both travelers' net-position math:
  - original expense shares owed
  - other travelers' shares on expenses they paid
  - payments already sent
  - payments already received
  - remaining net pay / receive position
- If the two travelers have direct original expense balances, those opposing relationships are shown together.
- Contributing expense lines show date, category, payer, participant share, expense total and a **View expense** link.
- Smart Settlement now includes three audit views:
  - **Smart Settlement** — optimized recommended transfers
  - **Original Balances** — the original expense-share relationships before group netting, expandable to every contributing expense
  - **History** — sent and receiver-confirmed settlement payments already deducted from the recommendation
- The UI explicitly explains that Smart Settlement is read-only and does not rewrite expense history.

## Accounting model

The app does not pretend that every optimized transfer maps to one receipt. A whole-group optimized transfer can be created by netting many relationships.

For each traveler the explainable net position is:

`gross receives - gross owes + payments sent - payments received = remaining net position`

A negative result means the traveler still needs to pay. A positive result means the traveler still needs to receive.

Original expense obligations remain separately visible so users can audit every contributing transaction.

## Data / migration

No database schema change is introduced in v70. No `db:push` is required when upgrading from v69, provided the v67 schema has already been applied.

## Validation

Run:

```bash
npm install
npm run v70:check
npm run build
```

The normal prebuild chain also includes the v70 regression gate.
