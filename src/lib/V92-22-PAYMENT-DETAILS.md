# V92.22 Individual Payment Details and Single Halo

V92.22 addresses the double Halo sequence confirmed in the 4 September PWA video and makes every person-to-person payment auditable as its own transaction.

## Loading correction

The authenticated app previously had two identical nested Next.js loading boundaries. During pull-to-refresh, the first Halo could finish, the page shell could flash briefly, and the second Halo could then appear. V92.22 removes the duplicate root boundary and keeps the scoped authenticated-app Halo boundary. The rotating Halo design remains unchanged.

## Individual payment ledger

The Settlements page now groups the current user's payments by person, direction and trip. Each group shows:

- total balance;
- confirmed paid or received amount;
- amount awaiting receiver confirmation and pending transaction count;
- amount not paid yet;
- open amount, which includes pending confirmation plus unpaid money; and
- a chronological list of every payment transaction.

Each transaction remains separate and shows its payment amount, recorded time, confirmation time when available, whether it is full or partial, and the balance remaining after that transaction.

Example: a MYR 100 balance with confirmed payments of MYR 40 and MYR 30, a MYR 20 payment awaiting confirmation, and MYR 10 not paid yet is shown as three transaction rows with remaining balances of MYR 60, MYR 30 and MYR 10.

## Data and deployment

No database migration is required. V92.22 derives this view from the existing canonical settlement records, so historical full and partial payments appear automatically after deployment. The service-worker cache is bumped to `miles-meals-static-v92-22`.
