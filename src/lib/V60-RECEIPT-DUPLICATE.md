# Miles & Meals v60 — Receipt Intelligence + Duplicate Protection

## Receipt improvements

Receipt recognition now additionally extracts:

- receipt date
- date confidence
- suggested expense category
- merchant confidence
- total confidence
- currency
- multiple merchant/total candidates

Medium/high-confidence receipt dates can prefill the expense date. Suggested categories can prefill the category while all detected fields remain editable.

## Duplicate expense warning

Before creating a new expense, the API checks the same trip destination/date for a matching merchant/description, currency and amount.

If a likely duplicate is found:

- the expense is not created immediately
- the user sees the existing matching record
- they can review expenses or explicitly choose **Save anyway**

This check is enforced by the API, not only the UI.

No database migration is required.
