# V96 Pre-Launch Test Matrix

This matrix is the final release gate for an invite-only/public beta. `P0` and `P1` rows are mandatory.

## Environments

| ID | Environment | Required |
|---|---|---|
| ENV-01 | Production-like PostgreSQL/Neon database with V93–V95 schema | Yes |
| ENV-02 | HTTPS deployment with production Better Auth base URL | Yes |
| ENV-03 | Transactional email configured with a real test inbox | Yes |
| ENV-04 | Web Push VAPID keys configured | Yes |
| ENV-05 | `CRON_SECRET` configured and retention endpoint schedulable | Yes |
| ENV-06 | Two normal travelers + Trip Owner + unrelated account | Yes |

## Device and browser matrix

| ID | Priority | Device / browser | Mode | Pass criteria |
|---|---|---|---|---|
| DEV-01 | P0 | iPhone 15 / current iOS Safari | Browser | No overflow, keyboard collision, broken safe areas, or blocked zoom |
| DEV-02 | P0 | iPhone 15 / current iOS | Installed PWA | Launch, resume, navigation, offline shell, safe areas work |
| DEV-03 | P1 | iPhone SE-size viewport | Browser/PWA | 320–375 px layout remains usable |
| DEV-04 | P0 | Pixel 7/current Android Chrome | Browser | Core trip and finance flows pass |
| DEV-05 | P0 | Pixel 7/current Android | Installed PWA | Install/update/offline/resume pass |
| DEV-06 | P1 | Samsung Galaxy/current Samsung Internet or Chrome | Browser | Forms, camera/file input, bottom nav pass |
| DEV-07 | P0 | Desktop Chrome | Browser | All major routes and finance flows pass |
| DEV-08 | P1 | Desktop Safari | Browser | Auth, planner, payments, proof view pass |
| DEV-09 | P1 | Desktop Edge | Browser | Auth, PWA installability, finance pass |

## Authentication and security

| ID | Pri | Scenario | Expected |
|---|---|---|---|
| SEC-01 | P0 | Production signup with no email provider configured | Public registration is unavailable/fails closed |
| SEC-02 | P0 | Signup with configured email provider | Verification email arrives; no authenticated session before verification |
| SEC-03 | P0 | Click valid verification link | Email verifies; subsequent sign-in succeeds |
| SEC-04 | P1 | Expired/used verification link | Safe error; no session bypass |
| SEC-05 | P0 | Unverified sign-in | Denied and a fresh verification email is triggered |
| SEC-06 | P0 | Cross-origin POST/PUT/PATCH/DELETE to app APIs | Mutation rejected |
| SEC-07 | P0 | Unauthenticated API access | 401/redirect as designed; no private data |
| SEC-08 | P0 | Country member tries another trip/country ID | 403/404; no data leakage |
| SEC-09 | P0 | Bystander country member requests A→B payment proof | 403 |
| SEC-10 | P0 | Payer requests own payment proof | 200 and correct image |
| SEC-11 | P0 | Receiver requests payment proof | 200 |
| SEC-12 | P1 | Trip Owner/admin requests payment proof | 200 |
| SEC-13 | P0 | `javascript:`, `data:`, `mailto:` planner link | Validation rejects / UI never renders executable href |
| SEC-14 | P0 | Non-HTTPS document external link | Validation rejects |
| SEC-15 | P0 | Upload PASSPORT/VISA/MEDICAL blob | Rejected; secure HTTPS link required |
| SEC-16 | P0 | Admin consistency with legacy sensitive blob | `SENSITIVE_DOCUMENT_BLOB_PRESENT` blocks launch |
| SEC-17 | P1 | Admin backup after V96 | Sensitive document blobs are redacted |
| SEC-18 | P1 | Payment proof response | `Cache-Control: private, no-store`, `nosniff` present |
| SEC-19 | P1 | Password/rate-limit brute-force smoke | Rate limits engage; no credential enumeration regression |

## Core UX / information architecture

| ID | Pri | Scenario | Expected |
|---|---|---|---|
| UX-01 | P0 | Bottom navigation | `Home / Plan / Add / Spend / More` only |
| UX-02 | P1 | Add hub | Expense, Plan item, Memory, Document all reachable |
| UX-03 | P1 | Spend hub | Expenses, Settlements, Budgets, Receipt Review reachable |
| UX-04 | P1 | Map discovery | Reachable from Home/Move and More |
| UX-05 | P1 | Pinch zoom | User zoom works on iOS/Android |
| UX-06 | P1 | Person Statement | Bill/payment totals reconcile and are readable on mobile |
| UX-07 | P1 | Empty/new trip | Clear empty states; no dead-end controls |
| UX-08 | P1 | Closed trip | Locked actions explain why; settlements remain usable as intended |

## Expense and receipt flows

| ID | Pri | Scenario | Expected |
|---|---|---|---|
| EXP-01 | P0 | Single payer + equal split | Payer/splits reconcile exactly |
| EXP-02 | P0 | Multi-payer expense | Payer amounts reconcile; balances correct |
| EXP-03 | P0 | Exact/percentage/share splits | Cent reconciliation is exact |
| EXP-04 | P1 | Receipt itemization + tax/service | Item allocations and final total reconcile |
| EXP-05 | P1 | Actual card base-currency amount | Settlement uses actual converted amount |
| EXP-06 | P0 | Same create request UUID retried | One expense only; identical result |
| EXP-07 | P0 | Same UUID with changed body | `409 REQUEST_ID_CONFLICT` |
| EXP-08 | P0 | Two editors submit same version | Exactly one wins; other receives stale conflict |
| EXP-09 | P0 | Expense with settlement allocation edit/delete | Blocked with audit-safe conflict |
| EXP-10 | P1 | Receipt list with many images | List payload excludes receipt blobs |

## Settlement and payment flows

| ID | Pri | Scenario | Expected |
|---|---|---|---|
| PAY-01 | P0 | A owes B RM50; A pays RM20 | A→B outstanding RM30 |
| PAY-02 | P0 | Breakfast RM50 paid RM20 | Bill status `PARTIAL`, remaining RM30 |
| PAY-03 | P0 | Hotel partial + Dinner full | Per-bill statuses and total statement reconcile |
| PAY-04 | P0 | One payment allocated across multiple bills | Allocation sum equals payment; each bill updates correctly |
| PAY-05 | P0 | Duplicate concurrent payment request | At most one active payment is created |
| PAY-06 | P0 | Partial payment larger than outstanding | Rejected |
| PAY-07 | P0 | Payer cancels unconfirmed `SENT` | Status `CANCELLED`; outstanding restored |
| PAY-08 | P0 | Payer tries to reverse confirmed `SETTLED` | Denied unless authorized by reversal policy |
| PAY-09 | P0 | Receiver/Owner reverses confirmed payment with reason | `REVERSED`; bill/outstanding restored; audit retained |
| PAY-10 | P1 | Payment method/reference/note | Persist and display accurately |
| PAY-11 | P1 | Payment proof attach/view | Proof saved; normal ledger only loads presence boolean |
| PAY-12 | P1 | Legacy/unallocated payment | Clearly shown as unassigned, never guessed onto a bill |
| PAY-13 | P0 | Smart Settlement | Netted transfer does not falsely settle specific bills |
| PAY-14 | P1 | Display-currency conversion | Settlement + allocations + paid/remaining all scale consistently |

## Offline / PWA

| ID | Pri | Scenario | Expected |
|---|---|---|---|
| OFF-01 | P0 | Install PWA then go offline | Offline shell opens |
| OFF-02 | P0 | Offline expense create | Queued with original trip/country/request UUID |
| OFF-03 | P0 | Switch active trip before reconnect | Queued expense syncs to original trip only |
| OFF-04 | P0 | Reconnect | Queue flushes once, no duplicate expense |
| OFF-05 | P1 | Failed/conflicting mutation | Remains visible/recoverable; not silently discarded |
| OFF-06 | P1 | Unsafe offline amount edit for exact/multi-payer/itemized expense | Blocked |
| OFF-07 | P0 | Service worker fetches authenticated API | Network-only; API response is not cached |
| OFF-08 | P1 | Offline document pack | Only trip-visible or current-user private docs selected in SQL |
| OFF-09 | P0 | Sensitive legacy document exists | Blob is never included in offline pack |
| OFF-10 | P1 | PWA manifest shortcut | Add uses `/add`; Spend/navigation naming matches V95/V96 IA |
| OFF-11 | P1 | Upgrade installed V95 PWA to V96 | New service worker/manifest update without navigation loop |

## Database failure / concurrency

| ID | Pri | Scenario | Expected |
|---|---|---|---|
| DB-01 | P0 | Fail after expense parent insert but before splits/payers | Whole transaction rolls back |
| DB-02 | P0 | Fail during expense edit derived-row replacement | Original expense remains intact |
| DB-03 | P0 | Expense write races financial close | Trip lock serializes; snapshot and ledger stay consistent |
| DB-04 | P0 | Two settlement requests race | Trip lock/idempotency prevents double application |
| DB-05 | P0 | Two stale expense edits race | Compare-and-swap permits one writer |
| DB-06 | P1 | Notification provider fails after finance commit | Financial API still reports committed success |
| DB-07 | P0 | Allocation references another country/trip | Rejected; health check detects any legacy corruption |
| DB-08 | P1 | Admin health report | No payer/split/allocation/proof/sensitive-document issues |
| DB-09 | P1 | Backup then restore disposable database | V1–V7 compatibility expected; V7 data round-trips |
| DB-10 | P1 | DB temporarily unavailable during mutation | Meaningful error; client does not create false success |

## Retention and operations

| ID | Pri | Scenario | Expected |
|---|---|---|---|
| OPS-01 | P0 | `/api/cron/retention` without bearer secret | 401/503; no deletion |
| OPS-02 | P0 | Wrong bearer secret | 401; no deletion |
| OPS-03 | P1 | Correct secret with expired fixture rows | Only rows older than configured windows deleted |
| OPS-04 | P1 | Current location/metric/audit rows | Retained |
| OPS-05 | P1 | Production health endpoint/admin health | Green before launch |
| OPS-06 | P0 | `npm run release:check` with clean install | Pass |
| OPS-07 | P0 | `npm run test:e2e` | Pass required P0/P1 automated cases |
| OPS-08 | P0 | Fresh production deployment smoke | Login, trip, expense, settlement, proof, offline shell all work |
| OPS-09 | P1 | Rollback rehearsal | Previous deployment + database rollback procedure documented/tested |

## Launch decision

**GO** only when:
- every P0 row passes;
- every P1 row passes or has an explicit owner-approved temporary exception with mitigation;
- `npm run release:check` and Playwright pass from a clean connected dependency install;
- admin consistency report is green;
- `SENSITIVE_DOCUMENT_BLOB_PRESENT` count is zero;
- no unresolved critical/high dependency vulnerability affects reachable application paths.
