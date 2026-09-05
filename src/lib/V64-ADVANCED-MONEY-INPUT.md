# Miles & Meals v64 — Advanced Money Input

## Mobile Add Expense redesign

v64 redesigns the Currency + Amount area on Add Expense to make the amount the primary action and currency a supporting choice.

### New layout

- Large **Amount paid** card with a prominent numeric input.
- Selected currency code stays visible beside the amount.
- Currency selector is full-width enough to show both code and currency name.
- A separate **Trip default** tile makes the configured destination currency obvious.
- Foreign-currency entries show an immediate estimated trip/base-currency amount.
- Base-currency entries show a compact "No conversion needed" confirmation.
- The existing Default / Cash / Card / Manual exchange-rate controls remain unchanged below, so no accounting behaviour is lost.
- Small-screen fallback stacks the currency and trip-default controls instead of squeezing them.

## UX goal

The user should first answer **"How much did I pay?"**, then adjust currency only when needed. This removes the cramped side-by-side 92px currency control from the v63 mobile layout.

## Database

No database migration is required from v63 to v64.
