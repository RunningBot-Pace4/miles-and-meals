# PWA layout and activation audit — 11 September 2026

## Fixed in this update

| Finding | Change |
| --- | --- |
| Home amounts such as RM 543.29 and RM 1,354.49 split between digits | Phone wallet cards use one column through 640px. Amounts retain normal digit grouping and tabular numerals. Decorative icons are removed on the narrowest screens to give the value more room. |
| Finance sections extend outside their parent | Nested finance children now account for their 16px outer margins instead of combining margins with full width. |
| Category heading appears centered and its amount/track extends right | Explicit heading columns replace the decorative flex spacer. Category labels can wrap, amounts remain together, and tracks stay inside the available width. View all is a visible 44px action. |
| Bill and statement totals can be squeezed on phones | Their summary grids switch to a single column through 480px. |
| First service-worker installation can reload an untouched page | Initial controller acquisition no longer reloads the page. Replacing an existing controller and explicitly requested updates retain their one-time reload behavior. |

The worker cache revision is `miles-meals-static-v92-21-responsive-2`.

## Review scope

Repository searches covered 42 page routes and 77 components for fixed widths,
grid layouts, inline dimensions, dialogs, input sizing, overflow, navigation,
safe-area rules, keyboard handling, refresh events and offline/update code.
The changes target shared styles used by Home, bill details and statements.
Existing payment/history, trip-management and offline fixes are included.
This was a source review, not a successful interactive walkthrough of every page.

Existing safeguards include 16px phone form controls, safe-area spacing around
the bottom navigation, a viewport-aware Add dialog, document navigation and
network-only authenticated API requests. The offline shell uses explicitly
saved trip data; the entire authenticated application is not available offline.

## Verification

- Automated suite: **319 passed; 4 database integration tests skipped**.
- Production build, source integrity and TypeScript: passed with build-only
  placeholder environment variables. No production database was accessed.
- Three new tests execute the actual production PWA activation handler for
  first installation, existing-controller replacement and explicit updates.
- The visual fixture now renders the real LiveDashboardFinance component with
  the screenshot amounts and a long category name. Its geometry check covers
  320, 360, 390, 430, 600, 768 and 1440px and detects clipped finance content and
  multi-line amounts, in addition to form overflow.
- **Visual check blocked:** the local Playwright browser executable is missing.
  The fixture was generated, but no browser screenshots or geometry pass were
  obtained. Installed iOS/Android PWA behavior still needs device verification.

The first-install correction follows the documented behavior of
[Clients.claim()](https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim):
it can trigger controllerchange when an initially uncontrolled page is claimed.
This is a concrete reload path found in source, not proof of the cause of any
previous recorded error screen.

## Deploy and verify

Use the complete source package and the existing instructions in
`DEPLOY-VERCEL.md`. No SQL migration or data reset is needed. This package has
not been deployed to Vercel from this workspace.

After deployment, open the installed app online and accept Update if offered.
Then check Home's budget details, spending categories, bill summaries and
payment history in portrait and landscape. Confirm all amounts remain legible,
View all is reachable, and the keyboard does not hide the active form action.
Check first-time installation without losing typed input, then an explicit
update. Recheck traveler selection and saved offline trip switching.

Do not uninstall or clear site storage while expenses are waiting to sync.
The offline expense queue must sync before any device storage cleanup.
