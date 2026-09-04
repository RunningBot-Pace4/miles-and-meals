# V92.25 — Receipt PWA and route recovery

## Receipt scan

- Removed **Split by receipt items** and its per-item traveller selectors from the Add Expense receipt workflow.
- Receipt OCR still fills the shop, total, date and suggested category.
- The normal **Who paid & who shares?** section remains the only split control.
- Untouched historical itemization data is preserved when an older expense is edited.

## Phone and installed PWA layout

- The Add Expense document, receipt panel, preview, OCR result and detected-value cards are capped to the physical viewport width.
- Long OCR/shop text wraps instead of widening the page.
- Horizontal page gestures are disabled for the expense editor while vertical scrolling remains native.
- The five-item bottom navigation is explicitly fixed, visible and placed above receipt content and iPhone safe areas.

## Navigation recovery

- Next.js links remain client-side, so the shared app shell is retained.
- Route prefetch is disabled by default so a tap requests the current deployment instead of reusing a stale prefetched React Server Component payload.
- Production route requests carry the Next.js deployment identifier.
- If a route still fails because a request was interrupted during an update, the error boundary claims one automatic document recovery for that exact path.
- The recovery guard prevents loops and is cleared only after successful hydration. Normal navigation does not perform a second request or delayed fallback.

## Deployment

No Neon schema migration is required. Deploy the complete source package, accept the PWA update once while online, then completely close and reopen the installed app.

