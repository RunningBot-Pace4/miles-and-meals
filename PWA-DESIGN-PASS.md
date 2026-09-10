# PWA design and consistency pass

## Included

- Compact Home banner and visible auto-loading trip selector.
- Detailed Halo overview and budget/category breakdown start collapsed. Home
  payment actions remain available without opening either section.
- Next activity appears in the next-steps summary.
- Shared authenticated-page styling for cards, primary buttons, form controls,
  focus indicators, section tabs, expense actions, planner actions and More.
- Compact mobile header, 16px mobile form text, minimum button sizes, teal Add
  action and existing blue-outline selected navigation.
- Full-width payment action placement on mobile resets legacy grid positioning.
- More uses shorter, task-oriented wording and coloured section headers.

This pass preserves partial-payment calculations, receipt allocation, locking,
permissions, background polling and the existing reliable document navigation.
No database migration or reset is required.

## Verification and limits

The existing automated suite passed 282 tests (4 database tests require a
dedicated database and were skipped). The production build is the release gate.

The fixture in scripts/preview-pwa.tsx renders actual shared components with all
four production stylesheets. Run `node --import tsx scripts/preview-pwa.tsx` to
produce /tmp/mnm-pwa-preview.html. It contains sample data and does not submit
payments. It is a static layout aid, not an authenticated end-to-end test.

Browser installation timed out in this environment, so rendered viewport and
installed-device checks could not be completed. Do not treat this package as
visually certified for iOS or Android. Check Home, expanded payment details,
expense entry and Planner at 360, 390, 430, 768 and 1440 CSS pixels, then test
the installed app with the keyboard open, long names, multiple trips and an
offline-to-online transition.

The full legacy stylesheet consolidation and navigation performance work
remain separate follow-ups; this pass introduces scoped shared rules without
removing the compatibility rules needed by older screens.
