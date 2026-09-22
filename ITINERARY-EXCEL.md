# Itinerary Excel import and export

## Where to use it

Open Plan, select the trip and stay on the Plan tab. The **Plan with Excel** card provides:

- **Download Excel template** for a blank reusable workbook.
- **Export itinerary** for the currently selected trip.
- **Import Excel** to preview and select rows before saving.

## Import rules

- Accepts `.xlsx` files up to 2 MB and 200 activities per import.
- Requires `Date` and `Place / activity` columns. `Time / timing`, `Area`, `Category`, `Map URL` and `Notes` are optional.
- The previously supplied Hong Kong workbook is supported.
- Flexible timing such as `After check-in`, `Around 19:15` and time ranges is preserved.
- The user chooses the worksheet when a workbook contains several compatible sheets.
- Invalid rows are shown with a reason and cannot be selected.
- Rows matching the same date, timing, area and activity are skipped. Existing records are never overwritten.
- Import is transactional. A failed batch does not leave a partly imported itinerary.
- Closed trips and view-only members cannot import.

Category remains descriptive itinerary data. Importing a plan does not create duplicate records in Places, Meals or Shop.

## Deployment

No database migration is needed for this feature. Deploy the complete source after applying the shared-route migration documented in `SHARED-ROUTES-AND-PWA-UPDATE.md` if that migration has not already been applied.
