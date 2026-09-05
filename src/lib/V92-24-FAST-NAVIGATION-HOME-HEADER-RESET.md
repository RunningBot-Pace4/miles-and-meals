# V92.24 — Fast navigation, journey header and safe reset

## Navigation performance

- Replaced full-document reloads with one Next.js client transition.
- Shared authenticated layout data remains mounted between page changes.
- Visible app links use adaptive prefetching; the five main mobile destinations
  are prefetched explicitly.
- Removed the custom link-level loading overlay and timeout. The authenticated
  route boundary remains the one source of the rotating Halo.

## Home header

- Added a contextual journey-status chip and personalized label.
- Added destination and travel-date facts beside the primary action.
- Added a subtle route graphic and state-aware accent treatment.
- Added dedicated phone layouts at 719 px and 360 px without horizontal
  overflow or an oversized decorative hero.

## Neon reset

Run `neon-reset-all-data-keep-logins-v92-24.sql` as one complete script after
creating a Neon backup or branch. It clears all application tables while
preserving every Better Auth user, credential, active session, verification
record and user preference. Pre- and post-reset checks roll the transaction
back if preserved authentication counts change.

No schema migration is required for V92.24.
