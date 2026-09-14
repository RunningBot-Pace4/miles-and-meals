# Payment form stability — 14 September 2026

Video review confirmed that ticking a receipt switches the amount between
valid and invalid states, replacing the whole payment form and closing its
details panel. The card now keeps the same action component and only disables
submission when invalid. Receipt ticks preserve the open panel and method,
reference, note and proof fields. Manual collapse still works.

The second video shows the old green acknowledgement remaining after the live
balance returns to RM53.90. The duplicate Home acknowledgement has been removed
entirely, including its stored text. Current pending payment cards and payment
history provide the payment status. Short save feedback remains on the action.
This supersedes the timer-based acknowledgement fix described in
PAYMENT-CANCELLATION-REFRESH.md.

The previous remainder reset and cancellation refresh changes are included.
The PWA cache revision is updated so installed apps can offer Update.

Validation: 326 automated tests passed; four live-database integration tests
skipped. Tests cover receipt selection transitioning between valid and invalid,
the RM60 minus RM45 remainder, disabled submission, and pending-card removal
without a historical green banner. The five old acknowledgement lifecycle tests
were replaced because that feature no longer exists. Browser/device interaction
testing remains unavailable; the videos and production source were inspected.

Deploy the complete source using DEPLOY-VERCEL.md. No SQL migration or reset
is required. Open the PWA online and accept Update if offered. Do not clear
storage or uninstall while expenses are waiting to sync. Not deployed here.
