# Payment amount redesign

The Home amount control now uses a large value, a separate currency badge and a visible outstanding balance. A Use full amount shortcut fills the smaller of the selected bills' outstanding total and the direct amount due. It never submits a payment.

Validation and remaining-balance feedback sit beside the amount, outside the collapsed payment details. Receipt-level allocations are still available under details. Sent payments remain clearly distinguished from confirmed receipts.

Amount, trip and receipt choices are disabled during the save request. Enter dismisses the amount field instead of submitting. The phone's native keyboard remains unchanged.

Reduced nested padding in the Home payment details on small screens. Other settlement amount inputs receive clearer currency spacing, larger text and a visible focus border.

No schema migration, database cleanup or payment-calculation change is included. Deploy the complete source using DEPLOY-VERCEL.md.

Verification: automated tests and production build are checked locally. Real iPhone keyboard and installed-PWA geometry remain unverified because the local browser executable is unavailable. This is a focused payment-form and surrounding-layout review, not a live-device audit of every screen.

Local result: 302 tests passed, 4 database integration tests skipped. The full production build and its prebuild validators passed. The static component preview also rendered successfully; static rendering alone does not validate browser geometry.
