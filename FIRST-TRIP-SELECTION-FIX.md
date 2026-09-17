# First trip selection correction

Removed the expense form's early bubbling `onInput` dirty-state update. Draft tracking now uses React's bubbling `onChange`, after the child control reads and updates its selected value. This applies to all expense form dropdowns, including trip, currency and payment method. Text-field edits still trigger React onChange and draft tracking.

The existing inline loading indicator, traveler timeout/Retry, currency changes, date display and save guards are preserved. No database migration is required.

The newer desktop recording demonstrates that mobile zoom was not the full explanation. This patch addresses the event-ordering conflict. Native browser first-selection behaviour still needs confirmation on the deployed version; automated release checks are not a substitute for that device test.
