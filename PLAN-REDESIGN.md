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

## Design correction after screenshot review

The first redesign reused legacy planner class names. The global theme applies !important rules to those names, producing black pill buttons, wrapped navigation and the oversized title panel. Plan now uses separate plan-v2 style hooks for those elements. Mobile icons are no longer hidden. Inline SVG section icons and colored activity icons replace inconsistent emoji rendering, with categories selected from each activity's type/title.

Validated with a server-render regression test that checks section icons exist and that navigation does not expose the old conflicting class names. This does not substitute for physical iPhone visual verification.

## PWA inset correction and admin-only reset

- Timeline cards now retain 12–16px horizontal inset at phone widths; time labels no longer sit on the card edge.
- The trip selector has explicit touch height, text inset and a single custom dropdown arrow.
- Active tab labels and icons use white text for contrast on teal.
- neon-cleanup-keep-all-admins.sql clears current application tables, non-admin users and all sessions, preserving every admin user plus their account credentials. Admins must sign in again. Take a database backup/branch first and run the whole transaction in Neon SQL Editor. The script was checked against the source schema but was not executed against a database. External object/file storage is not cleaned by SQL.
