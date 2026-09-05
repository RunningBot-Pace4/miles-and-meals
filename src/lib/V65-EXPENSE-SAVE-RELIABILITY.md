# Miles & Meals v65 — Add Expense Save Reliability

## Problem found

The Add Expense form mixed browser-native HTML validation with React submit validation.
On mobile Safari / installed PWA, a `required` field could stop the form before the
React `submit()` handler ran, while providing little or no visible feedback.

At the same time, the form used a global click-capture handler to mark the expense
as dirty. Tapping **Save expense** could therefore create an autosaved draft even
when the native browser validation blocked the save. This produced the confusing
flow:

1. tap Save
2. apparently nothing happens
3. leave the page
4. return later
5. `Unsaved expense found` appears

A possible duplicate or API error could also be created below the current viewport
because the Save bar is sticky while those messages were not.

## v65 changes

- Add Expense now uses `noValidate` and runs one consistent React validation path.
- Missing/invalid trip, date, description, amount, currency, FX rate, payer, split,
  actual card charge and receipt URL all produce explicit messages.
- The first invalid field is scrolled into view and focused when appropriate.
- Save errors render inside the sticky Save bar so mobile users cannot miss them.
- The form no longer marks itself dirty merely because any button was clicked.
  Actual form edits and state-changing category/rate/split/payer actions still
  trigger draft protection.
- A blank/default form no longer creates a phantom draft just because Save was tapped.
- Possible-duplicate responses automatically scroll the duplicate warning into view.
- **Save anyway** clears the stale warning before retrying.
- Expense POST/PUT requests now time out after 20 seconds with a clear retry message.
- An in-flight guard prevents accidental double submission from repeated taps.
- On success, draft flags are cleared before navigating to Expenses.
- Fixed an offline-queue edge case where clearing the draft could be immediately undone by the autosave effect after `busy` returned to false. Queued expenses no longer reappear as unsaved drafts.
- Existing offline queue/sync behavior remains unchanged otherwise.

## Database

No database migration is required from v64 to v65.
