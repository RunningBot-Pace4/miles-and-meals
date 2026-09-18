# Import Google Maps saved places

This release adds **Import Google list** in **Plan → Places**. It preserves the
existing app and smart-settlement changes. No database migration or Google API
key is required.

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

Names, notes, tags, comments and Google Maps links are retained. Places are saved
as undated ideas and appear immediately after a successful response. Edit each
place later to add a visit date or other details.

## Behavior and limits

- This copies a list once. It does not connect a Google account or synchronize
  later changes from Google Maps.
- This export contains links, not coordinates. Imports keep the original map
  links; this feature does not geocode places or add precise map pins.
- Use a Google Saved CSV with Title and URL columns, up to 250 entries and 1 MB.
  The Takeout preamble, blank rows, quoted fields and multilingual names are
  supported. Malformed entries are reported before saving.
- The selected trip must be open, and the signed-in traveler must have permission
  to edit its Plan. The server checks both.
- Existing matching Google Maps identities in that trip's Places are skipped and
  their edits are preserved. The same place can be saved in a different trip.
  Identical names at different map locations are kept as different places.
  Short and full links without a shared identifier may not match each other.
- A batch uses a database transaction and trip lock. Repeating an import after
  a lost response checks the saved links again instead of duplicating the batch.
- Import requires an internet connection. A failed attempt keeps the selection
  available while the panel stays open. It is not placed in the offline queue.

## Validation

- Production `npm run build`, including existing source and route checks: passed.
- Full suite: 353 passed, 4 skipped (the existing live database integration tests
  require `TEST_DATABASE_URL`).
- 18 new tests cover CSV parsing, Unicode, quoted notes, duplicate identity,
  malformed and unsafe links, selected-trip persistence, authorization, closed
  trips, repeat imports, batch failure and activity-log failure.
- The API tests use a transaction mock; they are not a live Neon integration run.
- TypeScript: passed.
- Responsive CSS stacks the actions on small screens and wraps long place names.
  A local browser preview was blocked by the browser environment, so visual PWA
  rendering and a real-device upload still need verification after deployment.

After deployment, import the list once and repeat the preview: it should mark all
25 places **Already saved**. Check the names and map links on your installed PWA.
