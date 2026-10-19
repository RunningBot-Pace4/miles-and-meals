# Named guest travelers — 19 October 2026

You can now split one expense between people who use Miles & Meals and named guests who do not need an account.

## Example

For a RM120 bill:

| Person | Type | Equal share |
| --- | --- | ---: |
| JY | App user | RM30 |
| JH | App user | RM30 |
| Alex | Guest | RM30 |
| Sam | Guest | RM30 |
| Total | Four people | RM120 |

The full bill stays RM120. JY's personal spending is RM30 when all four people share equally. If JY paid the whole bill, the three other people's shares are tracked separately in the financial ledger.

## How to use it

1. Open Spend and add or edit an expense.
2. Enter the full bill amount and choose who actually paid.
3. In Split with, tick the app users who share the expense.
4. Under Someone without the app?, enter a guest's name and press Add guest. The guest is selected for this bill automatically.
5. Repeat for the other guests, then choose Equal, percentage, Shares or Exact as required.
6. Check the per-person amounts and save the expense.

Guests remain in this trip's expense participant list for later bills. Adding the same guest name again, ignoring case, reuses that guest. Use distinct names when two different guests have the same name. Uncheck someone if they do not share a particular bill. Guests can also be selected as the person who paid upfront.

## Payments

Each guest has a separate balance and is labelled Guest in financial displays. Use Record received from guest only after you actually receive money. Use Record paid to guest only after you actually pay them.

These guest payments are completed immediately as manually recorded entries under the app user's identity. A guest has no account to confirm a payment. Payments between two normal app users retain the existing sender/receiver confirmation flow.

Partial amounts and receipt allocations remain supported. The app participant who recorded money paid to a guest can reverse their entry if it was wrong; receipts from a guest can be reversed by the real receiver. The audit record stays in history.

## Access and compatibility

- New guests need an internet connection. Saved guests are included in subsequent offline trip packs.
- Guests receive no invitation, login credentials, trip permissions or personal-budget prompt.
- Closed trips reject guest creation. Existing account-only expenses continue to work.
- No database schema migration or new environment variable is required for this change, provided the existing app schema is current.
- Backup format 8 includes guest names and their financial identities. Versions 1–7 remain accepted. Real login accounts and passwords still require a separate database backup.
- Deploy this source to your Vercel-connected project to make the feature available. This package has not been deployed by the assistant.

## Implementation notes for maintenance

The existing ledger references person IDs through the `user` table. Guest participant profiles reuse that identity key with a country-scoped `guest:` ID, role `guest`, a disabled login flag and an internal address in the reserved `.invalid` domain. No `account`, `session` or `trip_members` credential/permission entry is created. The authentication session hook and application session reader both reject guest identities. Administrative role, enable/disable and assignment endpoints also reject them; the login-account directory excludes them.

Guest creation is serialized under the trip lock, checks trip access and expense permissions, reuses the same request ID safely and prevents cross-trip identity assignment. Backup restore validates each guest's country assignment and inserts guest profiles before financial references. A guest is not automatically merged with someone who registers an app account later.

## Validation

- Full suite: 444 tests passed; four existing PostgreSQL integration tests skipped.
- Production build and TypeScript checks passed.
- New coverage includes two app users plus two guests, cent rounding, per-guest balances, access/closed-trip gates, creation retry behavior, manual guest payments, unchanged app-user confirmation requirements, reversal authorization and backup compatibility.
- New route tests use mocked database transactions. A live two-account plus two-guest test, actual PostgreSQL backup restore and physical iPhone PWA interaction have not been executed for this update.

The build's older Phase 8 check was updated to recognize the strengthened two-user test already included in the prior package; it had been looking for the obsolete test title.
