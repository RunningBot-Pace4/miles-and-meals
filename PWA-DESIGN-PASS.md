# PWA design and consistency pass

## Included

- Compact Home banner and visible auto-loading trip selector.
- Trip Overview and its Halo are always visible, without a collapse control.
  The budget/category breakdown remains expandable. Home payment actions stay
  directly available.
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

The automated suite passed 291 tests (4 database tests require a
dedicated database and were skipped). The production build is the release gate.

The fixture in scripts/preview-pwa.tsx renders actual shared components with all
four production stylesheets. Run `node --import tsx scripts/preview-pwa.tsx` to
produce test-results/pwa-preview.html. It contains sample data and does not submit
payments. It is a static layout aid, not an authenticated end-to-end test.

The browser is not installed and the download request could not obtain network
approval in this environment, so rendered viewport and installed-device checks
could not be completed. Do not treat this package as
visually certified for iOS or Android. Check Home, expanded payment details,
expense entry and Planner at 360, 390, 430, 768 and 1440 CSS pixels, then test
the installed app with the keyboard open, long names, multiple trips and an
offline-to-online transition.

## Cleanup and navigation follow-through

- Removed six exact duplicate CSS rules, retaining final occurrences to preserve
  cascade order. Removed the retired receipt-item splitting styles.
- Scoped settlement grid placement to settlement rows. Generic payment forms no
  longer inherit a named grid area intended for a different component.
- Fast native navigation no longer immediately flashes the full-screen loader:
  the visual indicator appears only after 250ms. Navigation itself is not delayed.
- Back/Forward page-cache restores reset pending indicators and selected-tab
  feedback. Same-document hash links never start a route loader.
- No client-side route prefetch or duplicate navigation was introduced. This is
  a feedback/reliability improvement, not a measured reduction in server latency.

## Reproduce the remaining visual check

Run from the project root:

```sh
npx playwright install chromium
node scripts/check-pwa-layout.mjs
```

This renders the actual Halo and payment components with the complete CSS
cascade, expands payment details, enters a reference, checks visible control
overflow and action width, and writes screenshots for five viewport widths into
test-results. It does not replace authenticated testing or real-device checks.
