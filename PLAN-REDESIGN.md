# Plan mobile redesign

This release applies the approved mobile design direction to the existing Plan module.

- Compact trip selector with trip dates and horizontally scrollable section navigation.
- Itinerary day strip, including dates with no activities yet, plus All days and Unscheduled.
- Search by activity/place name, area or category.
- Compact timeline with Edit, Details and More actions; Tasks and Pack keep completion controls.
- Places, Meals and Shop share compact cards with category colors, Map and Add to day.
- Add to day chooses a date and optional time, copies the original map pin and notes, and retains the saved place.
- Import/export, Excel templates, confirmation imports, saved-list imports, calendar downloads and stay settings remain available through the tools button.
- Add/edit/pin forms open in accessible native-dialog panels, styled as bottom sheets on mobile. Focus is contained and restored; Escape closes when not saving. Scroll and safe-area padding protect the content.
- Day routes have a numbered map of saved locations. No guessed destinations or simulated route lines. Google Maps opens real directions; long days/transit retain individual route legs.
- Closed-trip protections and server access checks remain in place. Distance checks remain explicit rather than repeated on tab selection.

## Deploy

Replace your source with the complete package and redeploy the existing Vercel project using its existing environment variables. No new database migration or paid map key is required for this redesign. The service-worker cache version was bumped.

## Verification

Automated regression and feature tests plus the production build are recorded in the delivery message. A local browser installation was attempted but failed with a download gateway error, so physical iPhone/PWA layout and keyboard behavior have not been visually verified. Before broad rollout, check a 360px phone, an installed iPhone PWA with the keyboard open, and desktop, especially add/edit sheets, long place names and long time labels.

The map in the approved concept image was illustrative. The implemented map displays actual saved pins and provider attribution; route geometry is shown by Google Maps when opened.
