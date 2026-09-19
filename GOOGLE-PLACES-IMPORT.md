# Free saved-list import and distance sorting

This release replaces Google Places paid lookup with Geoapify open-data geocoding.
No database migration is required. Google Maps saved CSV links are preserved.

## Setup
1. Create a free account at https://myprojects.geoapify.com/ (no credit card).
2. Create a project and copy its API key.
3. In Vercel, set server-only GEOAPIFY_API_KEY and redeploy this source.
4. Remove GOOGLE_MAPS_PLATFORM_API_KEY if previously configured; this release never calls Google Places.

The Geoapify Free plan currently includes 3,000 credits/day and up to five requests/second.
Stay on the Free plan; no paid fallback or automatic upgrade exists in this app.
Free service is limited, not unlimited. Quota/provider failures are shown without saving partial import data.
Small batches are paced sequentially; concurrent users still share the provider account limits.

## Use
In Plan → Places, Meals or Shop, enter your accommodation name. Upload the saved-list CSV.
The app searches each name with the trip country, shows the matched address and distance,
and sorts nearest to farthest from your stay. Distances are straight-line km, not walking routes.
Add a Category column containing Place, Meals or Shop to split one upload across tabs.
Without that column items default to Places. Review matches before saving.

Open-map business coverage differs from Google. This is a name/address lookup, not verification
of the exact Google Maps pin. City-only results are rejected; uncertain matches are flagged.
Unmatched names can be corrected with a fuller name/address in the CSV and uploaded again.
No manual coordinate entry is required. Real results for your list remain unverified until a free key is configured.
Original Google links remain available for checking the exact branch.

Imported rows retain their original names/links/categories, a Geoapify ID and selected order.
Coordinates and matched addresses are used in the preview. Saved accommodation names are looked up again
when opening an import. Earlier Google-based accommodation records can be resolved by their original name.
Existing imported rows are skipped rather than moved. Changing the stay does not reorder existing records.

## Validation and deployment
Run npm test and npm run build. API tests use mocked provider responses, not live Geoapify or Neon.
Four financial integration tests require TEST_DATABASE_URL. A real-device PWA import should be checked after setup.
The source archive is not a live deployment. Keep your existing Neon and Vercel configuration.

## Saved place distance display
Saved Places, Meals and Shop now resolve distances automatically when a stay exists. Each located item shows km from stay. Use Nearest first, Farthest first, or Plan order. Unmatched items remain last; distances are straight-line estimates. Results are reused in memory during the current planner session to reduce calls. Existing stays with weak matches require editing. New stays show a name/address confirmation before saving. Compact cards keep all actions available; full metadata is in View details.
