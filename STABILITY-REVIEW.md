# Stability review

The current design is retained. This review found and fixed two background
request issues:

- Offline queue requests now abort after 15 seconds instead of indefinitely
  holding up later sync attempts. Failed requests keep their queued data and
  original mutation ID, so the server can recognize a retry.
- The Home wallet queues a follow-up read when a save event arrives during an
  existing read. It no longer drops that event and waits for the next poll.
  Wallet requests also use the 15-second timeout.

## Verified locally

328 automated tests passed; four live-database integration tests were skipped.
The new tests cover a stalled offline request, retention and retry with the
same ID, and a save arriving during an in-flight wallet read. Existing tests
cover partial allocation, another pending payment, confirmation selection,
reversal rules, receipt selection, offline trip context and failed sync.
These tests do not establish live multi-user correctness or device performance.

Source review found the following background intervals: settlement data 15s,
Home wallet 30s, queued offline retry checks 60s (subject to backoff). Save,
reconnection and visibility events can request updates sooner. These are
scheduling intervals, not guaranteed server response times.

## Still pending

No E2E_BASE_URL or TEST_DATABASE_URL is configured. A working local browser is
unavailable. Installed iPhone/Android checks, real multi-user payment scenarios,
Neon concurrency checks and production response-time measurements remain open.
Use an isolated test trip and test accounts for these checks:

| Check | Expected outcome |
| --- | --- |
| Two receipts RM20 + RM40; send RM45 | RM20 and RM25 allocated; RM15 remains; one RM45 pending record |
| Send RM15 while RM45 is pending | Two distinct pending payments; no amount left available to pay |
| Confirm one pending payment | Only that payment becomes confirmed for both users |
| Cancel the other pending payment | Its allocations become payable again; no stale acknowledgement |
| Reverse a confirmed payment | It stays in audit history and its balance is restored |
| Capture expenses offline in two trips | Correct trip, currency and participants retained on reconnect |
| Interrupt sync then reconnect | No lost queued expense; retry does not create duplicates |
| Assign a traveler and expense | The other user's Home updates and budget setup appears where required |
| Phone portrait/landscape with keyboard | Amounts, actions and bottom navigation remain reachable |
| Install/update the PWA | First install preserves input; explicit update completes without a loop |

The deployed URL is needed for live checks, followed by an appropriate test
sign-in. Do not send production passwords or database secrets in chat.
Deploy this complete source with DEPLOY-VERCEL.md. No SQL migration or data reset
is required. This package has not been deployed here.
