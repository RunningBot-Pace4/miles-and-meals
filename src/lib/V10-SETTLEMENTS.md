# Miles & Meals v10 — One-click Settle Up

## Example

Expense:

- JY paid MYR 150.
- JY share: MYR 50.
- JH share: MYR 50.
- JJ share: MYR 50.

Miles & Meals automatically creates the outstanding recommendation:

- JH → JY: MYR 50
- JJ → JY: MYR 50

No repayment amount is typed manually.

## Status flow

### Debtor

JH sees:

```text
You owe JY
MYR 50
[ Mark paid ]
```

After clicking:

```text
Payment sent
Waiting for JY to confirm
```

### Receiver

JY sees:

```text
JH marked payment sent
MYR 50
[ Confirm received ]
```

If JH paid outside the app without first clicking **Mark paid**, JY can use:

```text
JH owes you
MYR 50
[ Mark received ]
```

That records the repayment directly as received.

## Dashboard person totals

Each traveler has:

- **Paid** — expenses they paid upfront.
- **Personal share** — the amount assigned to them by expense splits.
- **To receive** — unpaid plus sent-but-not-confirmed money due to them.
- **To pay** — current unpaid recommendations.
- **Payment sent** — repayments they marked sent but the receiver has not
  confirmed yet.

## Database

v10 adds the `settlements` table.

Run once after upgrading:

```powershell
npm run db:push
```

Do not reset Neon. Existing users, trips and expenses remain intact.
