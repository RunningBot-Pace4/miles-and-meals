# V92.23 — Contextual journey greeting

## Vercel overlay-deployment hotfix

The prebuild cleanup now removes a retired `src/app/loading.tsx` left behind
when this full-source package is extracted over an older checkout. The active
authenticated Halo remains at `src/app/(app)/loading.tsx`, so the app keeps one
continuous rotating loading boundary and the V92.22 validation gate can pass
on both clean and overlay deployments.

The dashboard no longer opens with the same generic “Welcome back” message. Its hero now reflects what the traveler is actually doing:

- no trips: invites the traveler to put the next journey on the map;
- all trips: presents every journey as one connected workspace;
- planning: focuses on shaping the trip, budget and crew;
- upcoming: names the destination and shows a day-based countdown;
- active: changes to a present-tense travel message;
- complete: shifts the emphasis to memories, payment review and retained details.

## Design changes

- Replaced the marker-style name highlight with a quiet personalized context pill.
- Added one restrained state accent rather than several competing word colors.
- Kept the headline, explanation and existing primary action in a single compact card.
- Added explicit layouts for desktop/tablet, standard PWA widths and screens at 360 px or narrower.
- Long names and destination text wrap safely without creating horizontal page movement.

## Release safety

- Pure trip-state copy generation is covered by unit tests for every supported state.
- A V92.23 release gate verifies the dashboard integration, PWA cache and responsive CSS contract.
- No database migration is required.
