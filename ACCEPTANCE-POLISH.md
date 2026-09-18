# Acceptance polish — 17 September 2026

- Constrain the hidden receipt upload input's physical and logical dimensions and anchor it inside its scan label. Global form styling previously expanded its logical width beyond the viewport.
- Keep keyboard focus visible on the scan label.
- Separate optional Home ideas from Needs attention and its open-task count. Suggestions remain available below payments.
- Refresh the service-worker static-cache version. No database migration or payment logic changes.

Deploy: replace your repository source with this package (keep your environment settings), commit and push to the Vercel-connected branch. Vercel runs `npm run build`. This package has not itself been deployed.

Previous live browser checks passed: first-attempt Vietnam selection, matching currency/travelers, payment details remaining open on trip/receipt selection, and the excessive-amount submission guard.

Physical installed iPhone/Android PWA testing, real offline/reconnect behavior, and two-user payment confirmation/cancellation remain unverified. Do not use production financial records for test payments.

After deployment: check Add/Edit expense at narrow phone and desktop widths for horizontal scrolling; tab to Scan receipt and verify focus; confirm optional memory suggestions are excluded from Needs attention. Confirm partial payment 45 against bills 20 + 40 leaves 15 in an isolated test trip, and cancellation restores the correct balance.
