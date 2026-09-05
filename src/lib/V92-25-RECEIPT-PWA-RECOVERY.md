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

## Navigation recovery — superseded by V92.26

- Next.js links remain client-side, so the shared app shell is retained.
- V92.26 restores adaptive prefetching for faster common destinations.
- Normal Vercel source builds use the platform's own skew protection; the app no longer supplies a competing custom deployment ID.
- Error boundaries never start an automatic reload, so one tap cannot become a client request followed by a second document request.

## Deployment

No Neon schema migration is required. Deploy the complete source package, accept the PWA update once while online, then completely close and reopen the installed app.
