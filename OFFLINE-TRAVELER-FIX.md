# Traveler directory and offline trip selection

## Changes

- The Create trip page loads the names-only traveler directory for first-time creators too. Previously, users without an owned trip received an empty directory. Emails remain restricted to admins.
- Empty traveler searches now explain whether no names match or no other active accounts exist.
- The standalone offline page supports visible trip buttons alongside the dropdown. Both dropdown input and change events select the trip; rendering synchronizes the selected option, heading, currency and sharing members.
- Unfinished expense fields stay separate for each trip during the current offline-page session. Switching trips does not silently carry a Vietnam amount into a Malaysia expense. These unfinished drafts are not persisted across page reloads; submitted queued expenses remain stored as before.
- Storage failures do not report an expense as saved or clear its form.
- The service-worker cache revision changed so the PWA can install the revised offline shell.

## Verification

316 tests passed; four database integration tests skipped. The production build and prebuild validators passed. Added tests execute the actual offline HTML script in a simulated DOM and verify switching, currency/member assignment, separate drafts and storage-failure handling. A separate page test verifies directory loading with no owned trips.

The recording shows the trip selection appearing to stay on Vietnam. The exact installed-iPhone cause was not reproduced locally; the picker handling and stale offline-shell update path were addressed. Real-device offline switching and synchronization should still be checked after deployment.

## Install

No SQL migration or reset is required. Deploy the complete source, then open the installed PWA online and tap Update when the update banner appears. In Offline, select each needed trip and use Refresh selected pack or Save selected Trip before testing without a connection. Do not clear website data or uninstall the app while unsynced expenses remain.
