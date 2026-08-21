# Miles & Meals v56 — Full Source Package

This ZIP contains the complete v56 source tree based on v55.

Included v56 behavior:

- Trip Owner status remains on one line in the traveler list.
- Assign/remove traveler actions display a blocking loading overlay.
- Missing personal budgets are checked live every 4 seconds and on window focus, so newly assigned travelers do not need to refresh.
- The newly assigned trip is made active before budget onboarding when possible.
- Assignment creates a trip notification; budget setup is requested only when no existing budget is present.
- Self-service trip creation verifies the creator as OWNER plus destination traveler, including System Admin creators.
- Newly created trips become active immediately and open the creator's personal-budget onboarding.
- Opening Create & manage trips repairs older creator assignments if either OWNER or country access is missing.
- v55 currency/OCR/All Trips Home enhancements remain included.
- v54 settlement locks and Trip Owner privacy permissions remain included.
- v53 notification reliability fixes remain included.

No database migration is required from v55 to v56.
