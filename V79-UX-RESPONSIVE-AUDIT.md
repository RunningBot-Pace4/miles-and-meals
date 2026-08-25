# Miles & Meals v79 — UX, Responsive and Reliability Audit

v79 audits the exact v78 source package that contained the clipped date calendar and long mobile controls. It is a corrective release, not a separate UI prototype.

## What was wrong and what changed

### Trip dates

The v78 calendar used an absolute/fixed overlay. At browser zoom, tablet widths and some PWA viewports it could overlap **Create trip**, escape the visible card, or show only its heading and weekdays.

v79 keeps the same simple interaction:

1. tap the date control;
2. tap the start day, for example the 5th;
3. tap the end day, for example the 9th;
4. the 5th is stored as Start, the 9th as End, and the dates between are highlighted.

The calendar now expands in normal form flow. It renders all 42 day buttons, pushes the submit button down, wraps complete date values when space is tight, supports Escape/Close/outside-click dismissal and retains server-side protection against an end date before the start date.

### Responsive design

The final containment layer covers 320, 360, 375, 390, 412 and 430px phones, plus 720, 768 and 960px tablet/browser-zoom equivalents. It enforces:

- no horizontal document overflow;
- every visible input, select, textarea and primary button stays inside the viewport;
- two-column forms collapse on phones;
- 16px phone form text to avoid iOS input zoom;
- full-width mobile actions where space is constrained;
- safe-area-aware top/bottom navigation and dialogs;
- long names, notes, references and headings wrap without stretching cards;
- tabs/segments scroll inside their own container instead of widening the page;
- images, maps, receipt previews and dialogs remain container-bound.

Native dropdown option text can ignore CSS on some mobile operating systems. v79 therefore also compacts long trip, user, currency, locale and time-zone labels to a safe display length while preserving the complete original record and an option title.

## Function and screen audit

| Area | Functions reviewed | v79 checks/fixes |
|---|---|---|
| Home | All trips, direct trip switch, budgets, categories, actions, activity | Selector containment, compact trip labels, cards/grids, mobile navigation |
| Plan | Trip filter, create/edit/delete, tabs, timeline, details, offline writes | Form collapse, tabs, dialogs, long text, stale/offline behavior |
| Expenses | List, add, edit, delete, currencies, FX, splits, receipt OCR/itemization | Money inputs, selects, receipt rows/modals, sticky save, error visibility |
| Settle Up | Direct trip switch, checkpoint, Smart Settlement, original balances, history, payment actions | No extra View button, responsive audit rows/tabs/actions, compact status labels |
| Trips | Create, edit, invite/revoke, owner controls, FX, traveler assignment | In-flow date range, full dates, one-country lock, collapsed destination management |
| Journeys | Optional grouping of several one-country Trips, create/edit/delete | Explanation retained, date range fixed, cards and selection rows contained |
| Trip Inbox | Text/image/PDF import, flight detection, review, Add to Plan | Flight/booking privacy wording, typed flight fields, forms/cards contained |
| Offline | Save/refresh pack, quick expense, automatic/manual queue resync, retry/discard | Explicit tap retries now, failure retention, blocked review, storage error feedback |
| Live map | Trip switch, GPS share/stop, member map | Selector, action stack, coordinates, map width and permission feedback |
| Notifications | Inbox, details, quick actions, push preferences | Bottom-sheet/modal bounds, long body wrapping, action layout |
| Search / Activity / Wrapped | Cross-trip search, audit timeline, trip story | Inputs, result rows, compact trip switcher, stat grids |
| Export / More / Settings | JSON/CSV, navigation hub, budgets, profile, regional preferences, password, notifications | Control widths, long regional options, cards, action wrapping |
| Admin | Users, roles/status/passwords, trips, countries/FX, backup, health, insights | Form grids, long user/trip options, detail rows, danger actions, report wrapping |
| Public/onboarding | Login, registration, invite, forgot password, required password/budget setup | Auth card widths, input sizing, validation/error states, small-phone containment |
| PWA shell | Manifest, icons/splashes, install viewport, service worker, offline fallback | Cache bumped to v79; safe-area and offline navigation validators retained |

## Offline resync behavior

- Automatic background sync is serialized and respects exponential retry backoff.
- **Sync pending**, **Sync now** and individual **Retry** controls are deliberate user actions and retry immediately.
- A queue item is removed only after a successful server response.
- Connection failures stay queued with a next retry time.
- 400/401/403/404/409/422 responses stay visible as **needs attention** instead of retrying forever.
- Each request carries its mutation ID so supported server routes can handle a lost response without duplicating the write.
- A device cannot silently exceed the 60-item safety limit.

## What E2E means and how to run it

E2E means **end-to-end**. Playwright opens a real Chromium/WebKit browser, signs in like a traveler, moves through actual pages and checks the rendered UI. Unit tests check individual logic; E2E catches integration and responsive failures such as a calendar covering a button.

First install and configure the app normally:

```bash
npm install
npm run test:e2e:install
```

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` in `.env`. Use an existing non-production test account that has at least one trip, then run the audited responsive file:

```bash
E2E_EMAIL="traveler@example.com" \
E2E_PASSWORD="test-account-password" \
npx playwright test e2e/mobile-v78-pwa-audit.spec.ts
```

Playwright starts the local development server automatically. To test a deployed staging site instead:

```bash
E2E_BASE_URL="https://staging.example.com" \
E2E_EMAIL="traveler@example.com" \
E2E_PASSWORD="test-account-password" \
npm run test:e2e
```

Do not point mutation-enabled E2E suites at production. The standard v79 responsive audit is read-heavy, but some older optional E2E files can create/edit financial records when their separate opt-in environment variables are enabled.

## Release checks

Run before deployment:

```bash
npm run release:check
npm run build
```

`release:check` runs the source/PWA/navigation/route/TypeScript validators plus Vitest. `build` repeats the prebuild gates and creates the production Next.js output.

No database migration is required from v78 to v79.

## Packaged validation record

- v53 through v79 regression validators: pass
- PWA, navigation and Phase 8 validators: pass
- Route integrity: 31 page routes / 202 source files
- Source integrity: 224 TypeScript/TSX files / 0 parse errors / 0 missing local imports
- TypeScript: pass
- Vitest: 18 files / 71 tests passed
- Next.js 16.2.12 production compile and 68-page static-generation pass: pass with inert build-time environment values
- Playwright discovery/type loading: 93 E2E cases across Chromium, WebKit and desktop projects

Authenticated browser execution still requires a configured test database/account and installed Playwright browsers; the exact command is shown above. The package does not claim that credential-dependent browser tests ran without those prerequisites.
