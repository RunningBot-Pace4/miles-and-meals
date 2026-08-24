# Miles & Meals v78 — Requested UX, Offline Resync & PWA QA

This release starts from the complete v77 source and addresses the seven-item review dated 24 August 2026.

## Included

1. **Instant Trip selection** — Settle Up opens the chosen Trip directly from the dropdown. No separate View Trip click is required.
2. **Click-twice date range** — Trip creation, Trip editing and Journey forms share one mobile-friendly calendar. Click the first day, then the last day; the selected range is highlighted.
3. **Clear Journey wording** — A Journey is optional. It organizes several country-specific Trips under one holiday name without combining currency, expense or settlement data.
4. **Honest Trip Inbox scope** — Trip Inbox parses a complete booking confirmation that the traveler supplies. A booking reference by itself cannot grant access to private airline/hotel records.
5. **Offline resync reliability** — Only one queue flush can run at a time. Changes queued during a flush are retained, discarded changes are not resurrected, and manual retry reports whether anything still needs attention.
6. **Responsive PWA coverage** — Authenticated checks cover 320/360/375/390/430px phones and the newer Journeys, Trip Inbox and Offline Pack routes. Tablet and desktop overflow checks are also included.
7. **E2E guide** — `E2E-TESTING-GUIDE.md` explains the safe basic suite and the optional data-changing settlement fixtures.

## Database

v78 adds no database tables or columns beyond v77. When upgrading from v70 or earlier, the existing v77 migration rule still applies: back up Neon first and run `npm run db:push`. Never use a reset command for an upgrade.
