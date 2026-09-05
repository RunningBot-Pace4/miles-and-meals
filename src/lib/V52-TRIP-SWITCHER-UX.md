# Miles & Meals v52 — Trip Switcher UX

## Changes

- Removed the extra locked-country explanatory sentence from Trip Owner.
- Home remains the default source of the active trip.
- Planner now lets travelers switch to another accessible trip from the Planner page.
- Add Expense now lets travelers switch to another accessible trip without reloading the form.
- Planner and Add Expense dropdowns display Trip Name instead of Country Name.
- Switching from Planner or Add Expense updates the same global active-trip cookie used by Home.
- Planner data reloads after a trip switch so only the selected trip plan is shown.
- Add Expense reloads members/currency/FX for the selected trip while keeping the page open.

The one-trip-one-country rule and System Admin-only trip deletion remain unchanged.
