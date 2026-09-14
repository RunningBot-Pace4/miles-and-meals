# Home pending-payment card

The pending-payment card now shows the person and trip first, followed by a
clear total and confirmation status. Each receipt has its own numbered row,
full wrapping description, and separately aligned applied amount. The list
replaces the previous continuous “Bills: …” sentence. On screens at or below
360px, each receipt's amount moves below its name to preserve reading space.

The visual treatment uses a soft blue header, a distinct total area, subtle
dividers, and a full-width Confirm received action. The section explanation
is shorter. Payment allocation and confirmation behavior are unchanged.
The previous stable receipt picker and removed stale banner are included.

Validation: the existing 326 automated tests passed; four database integration
tests were skipped. No new tests were added for this presentation-only change.
Real-device visual verification remains pending because a working local browser
is unavailable. Deploy using DEPLOY-VERCEL.md; no SQL changes are required.
Accept Update in the online PWA when offered. Not deployed from this workspace.
