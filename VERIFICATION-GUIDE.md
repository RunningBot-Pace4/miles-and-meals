# Miles & Meals — release verification

Updated 30 September 2026. This is a test guide, not evidence that the live checks passed.

## Current status

- The previous production source build passed on 29 September.
- This follow-up changes test code and documentation only; existing app functionality is unchanged.
- The financial browser test has been rewritten to verify the RM20 + RM40 partial-payment scenario, receipt allocations, pending remainder payment, cancellation, confirmation, reversal, and in-place refresh in both sessions.
- Test code type checking and Playwright discovery completed. Browser execution has not completed.
- PostgreSQL integration, a real backup restore, two-user browser testing and physical iPhone PWA testing are still pending. No production financial data was changed.

## 1. Isolated setup

Use a Vercel preview deployment connected to a separate Neon test branch/database, with two disposable accounts. Do not point the preview at the production database. Disable outbound email/push delivery in the test environment if it is connected to real recipients.

Create an open trip named `E2E Payment Check`, currency MYR, with exactly those two travelers. Set both personal budgets so the initial budget prompt does not interrupt testing. Both travelers must be assigned to its country. Create two expenses paid by the receiver, assigned entirely to the payer:

| Receipt | Date | Payer's share |
| --- | --- | ---: |
| E2E Bill 20 | 2026-09-01 | RM20.00 |
| E2E Bill 40 | 2026-09-02 | RM40.00 |

Start with no active settlements. The payer owes RM60 and the receiver is owed RM60. This deliberately simple fixture tests allocation without group offsets. Use separate disposable accounts without other trips so Home's person grouping is unambiguous.

Supply these environment variables through your local secret/environment settings. Never commit passwords or post them in chat:

```text
E2E_BASE_URL=https://your-test-preview.vercel.app
E2E_ALLOW_FINANCIAL_MUTATION=1
E2E_PAYER_EMAIL=<test account email>
E2E_PAYER_PASSWORD=<test account password>
E2E_PAYER_USER_ID=<test account id>
E2E_RECEIVER_EMAIL=<test account email>
E2E_RECEIVER_PASSWORD=<test account password>
E2E_RECEIVER_USER_ID=<test account id>
E2E_TRIP_ID=<E2E trip id>
E2E_COUNTRY_ID=<country record id>
E2E_BILL_20_ID=<first receipt id>
E2E_BILL_40_ID=<second receipt id>
```

IDs can be obtained from the corresponding test-database records. The payment test rejects the known production hostname, checks the `E2E ` trip name and exact starting balances, and only runs once on desktop Chrome. It still relies on you connecting the preview to a disposable database.

Install dependencies and browser engines in your development environment:

```bash
npm ci
npm run test:e2e:install
npx tsc -p e2e/tsconfig.json
npx playwright test e2e/two-user-settlement.spec.ts --project=desktop-chrome --workers=1
```

The test does not transfer actual money. It creates app payment records, then cancels/reverses its own records, preserving their audit trail. If interrupted, inspect the test trip for pending records before rerunning. Screenshots and traces may contain test-account details; keep them private.

## 2. Expected payment lifecycle

| Action | First receipt available to pay | Second receipt available to pay | Payment records |
| --- | ---: | ---: | --- |
| Initial state | RM20 | RM40 | None active |
| Payer sends RM45, no receipt selected | RM0 | RM15 | RM45 pending; allocations RM20 + RM25 |
| Payer sends remaining RM15 before confirmation | RM0 | RM0 | RM45 and RM15 pending |
| Payer cancels RM15 | RM0 | RM15 | RM45 pending; RM15 cancelled |
| Receiver confirms RM45 | RM0 | RM15 | RM45 confirmed |
| Receiver reverses RM45 with a reason | RM20 | RM40 | RM45 reversed; RM15 cancelled |

“Available to pay” excludes pending amounts so users do not pay them twice. Pending is not the same as receiver-confirmed payment.

The test checks the amount field changes to RM15, then back to RM60 after reversal; both accounts see the same ledger; receipt selection does not collapse details; and no full document navigation happens during payment updates. Cancellation and reversal are submitted through authenticated API requests, so separately click their buttons during the manual check to cover those dialogs as well.

## 3. Physical iPhone PWA check

Safari emulation is useful for layout but does not certify an installed iPhone PWA. Use the preview on a real iPhone, add it to the Home Screen, and check:

| Check | Expected result | Status |
| --- | --- | --- |
| Home, Plan, Spend, People, More | No clipped buttons, overlapping cards or sideways page scrolling | Not run |
| Payment keyboard | Amount visible, normal decimal entry, submit reachable after dismissing keyboard | Not run |
| Long trip/receipt names and large amounts | Text wraps without splitting money digits across lines | Not run |
| Place/Meal/Shop tabs | Correct section on first tap; saved route results appear | Not run |
| Trip switch with two test trips | Selected trip changes immediately and active planner section remains selected | Not run |
| Open payment details; tick receipt/change trip | Details remain open; amount and receipt list match selection | Not run |
| Airplane mode expense capture | Expense stays visibly queued; original bill is not duplicated | Not run |
| Reconnect | One server expense appears; queue clears only after success | Not run |
| Close/reopen while queued | Queue survives and later syncs once | Not run |
| Update while a draft is open | No forced reload or lost draft; update is offered safely | Not run |
| Safe areas/rotation | Bottom navigation and close buttons remain reachable | Not run |

For repeatable desktop/mobile-engine public-layout checks, with the preview URL set:

```bash
npx playwright test e2e/public-pwa.spec.ts
```

This checks public screens only, not authenticated financial flows or physical-device offline behavior.

## 4. Backup recovery drill

Use synthetic test data for this drill. Never restore over the production app to test backups.

1. In the test app, create a trip, two travelers, budgets, two expenses, a partial settlement, a stay and a place with a saved route. Note record counts and key values.
2. Export the admin backup. Check format version 7 and a nonempty `savedRouteDistances` list.
3. Make one identifiable change to the test data, then use backup preview. Confirm the preview accepts all references and shows the expected counts.
4. Restore within the isolated test database and verify the prior amounts, allocations, coordinates, saved walk/drive routes, and record counts return.
5. Verify accounts can still sign in. App backups exclude accounts and passwords; restoring into a fresh database requires those original user IDs from a separate database backup. Do not create unrelated new IDs and expect relationships to match.
6. Revisit Plan tabs. Saved route results should be available without pressing Recalculate.
7. For database transaction tests, set `TEST_DATABASE_URL` to a separate Neon test branch with the current schema, then run:

```bash
npx vitest run tests/financial-concurrency.integration.test.ts
```

Do not count the seven mocked backup contract tests as a real restore. A complete database backup also matters because app exports intentionally omit login data and some operational/audit data.

## 5. First-time user trial

Ask someone who has not used the app to complete these tasks without coaching:

1. Create a trip and add a traveler.
2. Add one shared expense and find their personal share.
3. Record a partial payment against a receipt and identify the amount still owed.

Record completion, wrong turns, and any labels they misunderstood. Their ability to finish independently is the usability evidence; another automated test count is not a substitute.
