# Miles & Meals v56 — Owner Row + Live Budget Prompt + Creator Assignment

## 1. Trip Owner status stays on one line

The Trip Travelers list now reserves enough width for the right-side status.
`Owner` no longer wraps into two lines on desktop or narrow cards.

## 2. Traveler assignment gets a proper loading state

When a Trip Owner adds or removes a traveler, a blocking saving overlay is shown
while the assignment is being written. The traveler row is updated in-place when
the request completes.

When a newly assigned traveler has no personal budget for the trip, the owner is
told that the traveler will be prompted to create one. If a previous budget still
exists (for example after removing and re-adding the traveler), that budget is kept
and no unnecessary budget prompt is shown.

## 3. Budget setup appears without manual refresh

The authenticated app checks for missing personal trip budgets every 4 seconds and
again whenever the browser window regains focus.

If a traveler is assigned while Home or another app screen is already open:

1. the assignment is detected without a manual page refresh;
2. the newly assigned trip is made the active trip when possible;
3. the user sees the `New trip assigned` loading prompt;
4. the app opens `/onboarding/budget`;
5. the traveler enters their personal budget before returning to the workspace.

The budget check now considers all trips accessible to the traveler rather than
only the previously active trip.

The password-change screen remains higher priority and is not interrupted by the
budget gate.

## 4. Trip assignment notification

Assigning a traveler records an in-app `TRIPS` notification and attempts Web Push
when that device has push enabled/configured.

The notification links to budget setup only when the traveler has no existing
budget. Re-assignment with an existing budget links to Home instead.

## 5. Creator/Admin is guaranteed to be Owner + traveler

Self-service trip creation now verifies both records before success is returned:

- `trip_members` = `OWNER`
- destination `country_members` includes the creator

This applies to normal users and System Admin users using **Create & manage trips**.

After successful creation, the new trip is made the creator's active trip and the
creator is sent directly to personal-budget setup.

A lightweight self-heal also runs when the creator opens **Create & manage trips**.
It repairs older creator records that may be missing either the OWNER membership or
destination assignment.

## Database migration

No database schema change is introduced in v56.

From v55 to v56, do **not** run `npm run db:push` just for this release.
