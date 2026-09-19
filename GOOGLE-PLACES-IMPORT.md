# Import Google Maps saved places

This release adds **Import Google list** in **Plan → Places / Meals / Shop**. It preserves the
existing app and smart-settlement changes. No database migration is required.

## Google Maps setup required

Automatic matching uses the official **Places API (New)**. In Google Cloud:

1. Create or choose a project, attach billing and enable **Places API (New)**.
2. Create an API key and restrict its API access to **Places API (New)**. This is
   a server key; do not add an HTTP-referrer restriction intended for browser keys.
3. In Vercel, add `GOOGLE_MAPS_PLATFORM_API_KEY` to Production, Preview and
   Development as needed. Redeploy after saving it. Never use a `NEXT_PUBLIC_`
   prefix, commit the key or place it in the CSV.

Google bills Text Search and Place Details requests according to the fields used
and the account's current plan. One 25-place import performs location lookups for
the accommodation and list. Configure Google Cloud budgets and quota limits.

## Deploy

1. Unzip this source package and replace the project source in your existing
   repository. Keep your existing Vercel environment variables and Neon database.
2. Commit and push to the branch connected to Vercel, or deploy this project using
   your existing Vercel workflow. The build command remains `npm run build`.
3. After deployment, reopen the app and accept its available PWA update.

This source package has not been deployed by the assistant.

## Import the Hong Kong list

1. Open **Plan** and choose the **Hong Kong trip** using the Trip selector.
2. Open **Places → Import Google list**.
3. Choose the `Hong Kong.csv` export you uploaded in this conversation.
4. Confirm that **Save places to** names the intended trip. Review the list and
   untick any places you do not want. Ticking a place keeps the preview open.
5. Click **Save 25 places**, or save the smaller number you selected.

The supplied CSV was checked with the new parser: **25 valid places, no duplicate
entries, no skipped records**. The original CSV is not embedded in the source
package. No places have been written to your live app during development.

Names, notes, tags, comments and Google Maps links are retained. Items are saved
as undated ideas and appear immediately after a successful response. Edit each
item later to add a visit date or other details.

## Keep the selected tab when changing trip

Changing the Trip selector now preserves Places, Meals, Shop or whichever planner
tab you were viewing. Reloading the page also preserves the selected tab through
the URL. Unknown tab values safely fall back to Plan.

## One CSV for Places, Meals and Shop

Add a column called **Category** after the existing columns:

| Category value | Destination |
| --- | --- |
| Place or Places | Places |
| Meal, Meals or Food | Meals |
| Shop, Shops or Shopping | Shop |
| Empty or no Category column | Places |

Capitalization does not matter. Unrecognized categories are reported and skipped.
One upload imports all categories. You can also change each category in the preview.
The importer is available in all three tabs. Ticking selections does not collapse it.
Repeated locations are checked across Places, Meals and Shop within the trip;
existing items are preserved, so reimporting does not move or overwrite them.

## Accommodation and distance ordering

1. In Places, Meals or Shop, choose **Add stay** above the importer.
2. Enter the full name of your accommodation. The app checks it with Google Maps.
3. Review the returned Google name, then save it. The accommodation becomes a shared Plan item for this trip and can be
   updated with **Edit stay**. Existing Plan permissions and closed-trip restrictions
   apply.
4. Upload the CSV. The app checks every place name with Google Maps automatically.
   Review the matched Google name and address. Weak matches are visibly flagged.
5. **Nearest to accommodation first** is enabled by default. Review distances,
   untick any wrong match and save. The order is retained in each category.

Distances are straight-line kilometers from the accommodation, not road distances
or a route optimized between consecutive stops. Unknown locations remain last in
their original relative order. You can untick sorting to retain the CSV order.
The supplied Hong Kong export has no coordinates, but users do not need to add
them. The server uses each exported title and the trip country to retrieve the
current location. Unmatched items remain visible but are not selected. Changing
the stay later does not automatically reorder previously imported items; upload
again to review a new order, while duplicates remain protected.

## Behavior and limits

- This copies a list once. It does not connect a Google account or synchronize
  later changes from Google Maps.
- Imports keep the original user-provided map links. Google coordinates and
  formatted addresses are used only in the live preview and are not persisted.
  The permitted Google Place ID is retained so the accommodation can be refreshed.
- Google Maps attribution is displayed beside returned Google content. Public
  Privacy and Terms pages explain this processing and link to Google's policies.
- Use a Google Saved CSV with Title and URL columns, up to 250 entries and 1 MB.
  The Takeout preamble, blank rows, quoted fields and multilingual names are
  supported. Malformed entries are reported before saving.
- The selected trip must be open, and the signed-in traveler must have permission
  to edit its Plan. The server checks both.
- Existing matching Google Maps identities in that trip's Places, Meals and Shop are skipped and
  their edits are preserved. The same place can be saved in a different trip.
  Identical names at different map locations are kept as different places.
  Short and full links without a shared identifier may not match each other.
- A batch uses a database transaction and trip lock. Repeating an import after
  a lost response checks the saved links again instead of duplicating the batch.
- Import requires an internet connection. A failed attempt keeps the selection
  available while the panel stays open. It is not placed in the offline queue.

## Validation

- Production `npm run build`, including existing source and route checks: passed.
- Full test suite: **368 passed, 4 skipped**. The four existing live database
  integration tests require `TEST_DATABASE_URL`.
- Import tests cover CSV parsing, Unicode, quoted notes, duplicate identity,
  malformed and unsafe links, selected-trip persistence, authorization, closed
  trips, repeat imports, batch failure and activity-log failure. Additional tests
  cover tab URLs, mixed-category storage, distance calculation, stable sorting,
  Google response parsing, title-match confidence, concurrency, access control,
  missing configuration, Google Place ID refresh and provider failures.
- The API tests use a transaction mock; they are not a live Neon integration run.
- TypeScript: passed.
- Responsive CSS stacks the actions on small screens and wraps long place names.
  A local browser preview was blocked by the browser environment, so visual PWA
  rendering and a real-device upload still need verification after deployment.

After deployment, save the accommodation and upload the list. Verify every item
marked **Check this match**, confirm the distance order, then save. Repeat the
preview: it should mark saved items **Already saved**. Check the result on the
installed PWA.
