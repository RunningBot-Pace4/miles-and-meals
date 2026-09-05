# Miles & Meals v23 — Receipt Viewer, Transparent Loading, Mobile Audit

## 1. View saved receipts

Saved expenses now show `View receipt` when a receipt exists.

The receipt image is fetched only after the button is pressed, so expense list
pages do not download every embedded receipt image.

Embedded Neon receipt images open in a responsive in-app modal.

Existing external receipt URLs are also supported and offer an `Open receipt`
button.

The receipt API checks the signed-in traveler's country access before returning
the saved receipt.

## 2. Transparent meaningful loading

The old white full-screen loader has been replaced with a translucent glass
overlay. The current page remains visible underneath during client actions.

The loader uses the Miles & Meals brand and a small trip flow:

```text
Plan → Spend → Share
```

Loading copy changes by action, for example:

- Reading your receipt
- Saving your expense
- Removing expense
- Updating your plan
- Refreshing live locations
- Recording payment
- Updating trip setup
- Saving your profile
- Updating your password
- Signing in / signing out

Route loading uses:

```text
Preparing your trip...
Loading plans, expenses and balances.
```

## 3. Action loading coverage

Shared loading overlays are used by all asynchronous client action components:

- Admin forms
- Password change
- Expense delete
- Expense create/edit
- Receipt OCR
- Receipt viewer
- Live-location refresh / first GPS fix
- Login
- Planner add/edit/delete
- Profile save
- Registration
- Settlement actions
- Account-menu sign out
- Standalone sign out

Normal route navigation continues to use Next.js loading boundaries with the
same visual design.

## 4. Mobile UI audit

The mobile hardening pass covers:

- Page headings
- Inputs and selects
- Long dropdown values
- Two-column forms
- Admin forms
- Planner tabs and cards
- Timeline cards
- Expense cards and FX fields
- Category controls
- Split controls
- Receipt preview and receipt modal
- Settlement cards
- Profile/settings forms
- Live-location controls, member cards and buttons
- Mobile navigation
- Long names, emails, coordinates and labels

At phone widths:

- two-column forms collapse to one column where appropriate
- dropdown/input widths cannot exceed their containers
- long text can wrap instead of forcing horizontal scrolling
- tab/segment rows use controlled horizontal scrolling
- location action buttons become full-width
- receipt viewer becomes a near-full-screen mobile modal
- form controls use a mobile-safe font size on small phones
- page/card containers enforce `min-width: 0`

## 5. Location safety cleanup

While touching the mobile location UI, v23 also:

- removes direct `window.isSecureContext` access during render
- uses mounted state instead
- replaces MapLibre popup HTML injection with safe text
- captures the map container before async MapLibre initialization for stricter
  TypeScript builds

## Database

No Neon schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
