# Miles & Meals V92.26 · Vercel-managed navigation recovery

V92.26 preserves the complete V92.25 receipt and PWA layout release. It removes
the custom deployment identity that conflicted with normal Vercel source builds,
returns page transitions to Vercel-managed skew protection, restores safe route
prefetching, and prevents an error boundary from starting a second page load.
The rotating Halo remains. No Neon migration is required.

Version `1.92.26` removes receipt-item assignment from receipt scanning, prevents the Add Expense canvas from moving horizontally, and keeps the mobile bottom navigation visible. Navigation stays client-side and single-request during normal use, with Vercel managing deployment skew and error screens never launching a second automatic request.

## What changed

- The generic “Welcome back” headline and marker-style name highlight were replaced with a compact premium journey card.
- Greeting copy now changes for no trips, all trips, planning, upcoming, active and completed travel states.
- Upcoming trips use the destination and an exact day countdown; active trips switch to present-tense travel guidance.
- The card uses one restrained state accent, a personalized context pill and safe wrapping at phone, tablet and desktop widths.
- Seven pure unit tests and a release-contract suite cover the greeting states and responsive integration.
- One payer and Multiple payers now use the same compact traveller-row design instead of switching between portrait cards and a different list language.
- A selected multiple payer keeps the currency and amount in one fitted input. `MYR` can no longer collapse into a detached strip above a large empty box.
- The two payer-mode choices and all four split methods use fixed equal-width columns; **Exact** no longer drops onto a second row.
- At 320–360 px, selected payer details stack safely; from 361 px upward, the name and contribution remain in a compact two-column row.
- Saved traveller groups are fetched only when **Reuse a traveller group** is opened, removing an unnecessary Add Expense request.
- Main app destinations use one reliable document navigation. There is no delayed fallback request, and authenticated pages now have one scoped Next.js Halo loading boundary instead of two nested boundaries.
- Payments are grouped by person, direction and trip. Each payment remains a separate row showing its amount, recorded and confirmation times, partial or full status, and remaining balance.
- Person summaries separate confirmed money, money awaiting receiver confirmation, money not paid yet, and the total amount still open.
- The duplicated Living Journey base stylesheet was removed. The shared route CSS fell from 353,528 to 340,733 bytes, a 12,795-byte (3.6%) reduction, while the complete Add Expense initial CSS + JavaScript payload is 6,003 bytes smaller.

- Mobile Web and installed PWA now publish one device-width, fixed-scale viewport so the interface starts fitted to the physical phone width.
- Every text, number, date, select and textarea control uses a minimum 16 px computed font on screens up to 719 px, preventing iOS from auto-zooming when a field receives focus.
- While the phone keyboard is open, the Expense Total/Save bar returns to normal document flow instead of following the reduced visual viewport and covering Exchange Rate or Trip Amount fields.
- Desktop retains its sticky Expense Save bar because no software keyboard collision exists there.
- Responsive regression coverage measures the focused expense layout at 320, 360, 390, 430, 600 and 719 px, plus the desktop behavior at 1024 px.

- The traveler-permissions notice now has explicit icon and copy columns, so iOS cannot place the sentence inside a 28 px column or wrap it one letter at a time.
- Repeated authentication, preference and notification reads are deduplicated within a server-render request.
- Unread notification totals are calculated by PostgreSQL instead of loading every unread notification ID into the app.
- Missing-budget detection uses one database anti-join instead of two sequential queries.
- The default all-trips Home reuses its already-loaded active-trip expense and budget summary instead of calculating the same finance data twice.
- The expensive all-trip offline pack warmup is delayed until the first page becomes interactive and its refresh timestamp survives full-page navigation.
- An empty offline queue no longer starts a sync operation or calls the sync engine every 30 seconds.
- Global and page-specific pollers use slower safety intervals while existing focus, online, save and collaboration events still refresh immediately.
- MapLibre CSS is route-scoped to the live-location page rather than being included in every Home, Plan, Expense, Settlement and More response.

- White/light app canvas with restrained blue, yellow, peach and green accents.
- Thin four-segment Halo with Move, Plan, Spend and People modes.
- Data-first Home hierarchy: current action first, useful detail second and connected actions third.
- Compact light cards, black primary actions and progressive disclosure across Plan, Map, expenses, receipts, settlement, documents, offline, Companion, people, memories, notifications, settings and admin.
- Dedicated mobile PWA treatment for 320, 360, 390 and 430 px.
- Dedicated PC sidebar and wider data layouts from 1024 px.
- New V92 app icon, versioned manifest, Apple icon, maskable icons, notification icon and service-worker cache.
- Light launch, loading and standalone offline experiences.
- Compact animated Halo loader, restored centre Add button and explicit More-page context labels.
- Repeated “Living Journey” promotional wording removed from the interface.
- Selected tabs and active navigation use only a clean blue outline: no black fill, white text or check mark.
- Halo selection moves to the newly touched mode immediately, without Safari's grey tap flash.
- Larger touch targets and a restrained detail-panel transition keep Move, Plan, Spend and People easy to use and visually stable.
- All four information panels now share one equal-height stack, so the Halo, tab row, page height and bottom navigation do not jump when a mode changes.
- Move, Plan, Spend and People stay in four equal-width fixed columns; selection cannot resize, translate or overlap a neighbouring tab.
- The four controls now live in their own grid instead of sharing the Halo circle's legacy positioning context, removing the underlying CSS conflict rather than masking it.
- Bottom navigation shows only the newly tapped destination while the page opens.
- More-page rows keep a blue outline while the selected destination opens.
- One controlled service-worker activation path with automatic reload timeout and a visible Retry state.
- Fast client navigation for authenticated pages, with a timed native document fallback if a PWA transition does not complete.
- Reduced and protected background polling, plus a five-minute offline-pack refresh throttle.
- Health checks now distinguish a genuinely missing table from a temporary Neon query failure.
- Optional remembered email and persistent session; passwords remain with the device/browser password manager and are never stored by the app.
- One sign-in loading state instead of an overlay followed by a second loader.
- Node.js 24 matches the Vercel project setting, removing the engine-override warning.
- Compact 48 px date, Trip and description controls replace the oversized expense-entry fields.
- Expense categories expose their real selected state with the requested blue outline.
- Password visibility uses an accessible eye/eye-off icon instead of Show/Hide wording.
- Saved traveller splits are now an optional collapsed shortcut with a clear explanation.
- Settlement rows keep names, amount, currency and payment controls in stable responsive columns.
- The Halo uses full-Trip wallet totals while retaining today's context, so existing spending no longer appears missing.
- The redundant lower yellow Home hero is removed; its trip selector, dates and wallet data now live inside the top command centre.
- Every native date, time, month and date-time field now uses one compact 46 px light control across web and PWA.
- The Trip/Journey range calendar is reduced to a compact trigger, with guidance shown only while the calendar is open.
- The range calendar highlights today, the selected range and the active start/end step without oversized permanent instructions.
- Mobile settlement actions now occupy a dedicated full-width row, so Amount, MYR, help text and Mark paid cannot collapse vertically.
- Representative settlement and calendar layouts are measured at 320, 360, 390 and 430 px as part of the release coverage.
- An authenticated 24-page PWA sweep checks horizontal containment, collapsed text controls, calendar height and fixed-navigation layouts at all four target widths.
- Partial payment and receipt actions request an immediate no-cache settlement refresh.
- The amount field resets to the newly calculated outstanding amount as soon as refreshed data arrives.
- The action is disabled while the remaining balance refreshes, preventing accidental duplicate submissions.
- Clear status feedback confirms the partial amount and displays the updated remaining balance without a manual page reload.
- Receipt OCR worker, core and English/Vietnamese language data now load from Miles & Meals itself, matching the PWA security policy instead of relying on blocked cross-origin workers.
- iOS/PWA receipt decoding has a normal-image fallback when `createImageBitmap` is unavailable or rejects a camera photo.
- Failed scans retain the photo and provide a clear **Try scan again** action.
- Payment-sent rows use blue and payment-due rows use amber, with text badges and stronger left-edge accents for quick recognition.
- The third Expenses overview card again shows **Settle Up**, payment states and its explanation instead of appearing as an empty white panel.
- Receipt scanning now detects the bright paper area, removes most table/background pixels and enlarges the actual receipt before OCR.
- Edge detection fails safely: light or ambiguous photos retain the complete image instead of risking a destructive crop.
- The OCR working image increases from 2600 to 3600 px on its longest side and still compares enhanced, binary, header and total-area passes.
- Recent Activity and Travel Shortcuts keep their heading and secondary action on one balanced phone row.
- Phone section gutters are consistent between headings, activity rows and shortcut cards.
- 720–1023 px tablets now use a purpose-built two-column Trip Command Centre instead of a stretched, vertically stacked phone layout.
- Tablet welcome content stays left aligned, the action stays right aligned and the Halo is capped at a comfortable reading size.
- The full authenticated route audit now covers 320, 360, 390, 430, 600, 768, 820, 1024 and 1280 px layouts.
- Personal and group wallet panels no longer leave an accidental empty fourth grid cell on phones.
- The first budget card is intentionally featured at full width; the two related values form a balanced row beneath it.
- Very narrow 320–360 px phones use one full-width card per row to prevent currency amounts from wrapping awkwardly.
- Small and standard tablets show all three wallet cards in one balanced row.
- **Edit** and the submitted-budget count remain aligned to the right of their section headings.
- The **Quick things to do** count now stays in the heading row as a compact status pill.
- Attention rows use a protected icon–copy–arrow layout; long titles and explanations wrap without colliding with the arrow or being cut off.
- Finished-Trip and Smart Settlement labels are shorter and clearer on phones while preserving their full action meaning.
- Shared list rows, action groups, notification rows, documents, offline data, settlement history, receipt review, Trip cards and admin rows now follow the same mobile containment rules.
- Phone-only data layouts collapse predictably to one column, while wider tablet and desktop layouts retain their useful multi-column structure.
- Responsive tables scroll inside their own container instead of forcing the complete page outside the viewport.
- The authenticated sweep now represents every static authenticated page route and checks row containment, clipped attention copy, controls, calendars and bottom-navigation clearance.
- Login, registration, password recovery and the standalone offline page have a separate 320–1024 px public-layout sweep.
- Offline expense sharing now uses compact 24 px controls; traveler names cannot sit underneath an enlarged native checkbox.
- **Everyone** and **Only me** keep a white surface with the requested blue selection outline.
- Traveler permissions show one compact full-access summary for the owner and aligned, accessible controls for editable travelers.
- Category Limits explicitly reports **Editing enabled**, **View only**, or **Closed Trip** before the rows, instead of presenting unexplained disabled fields.
- Category currency prefixes remain on one line, and every editable row exposes a visible **Save limit** action.
- The authenticated full-app audit now rejects oversized checkbox/radio controls, while a dedicated geometry audit measures the three reported screens at phone, tablet and desktop widths.
- **V92.18:** Add Expense uses a compact blue-outlined receipt action with a professional camera icon and no repeated app name.
- **V92.18:** The phone Total/Save action stays in normal document flow, so it cannot cover Date, Category, Amount or exchange-rate fields after the keyboard closes.
- **V92.18:** The four exchange-rate choices fit the available width instead of creating an internal horizontal scroller.
- **V92.18:** Expense-page width and overscroll are contained specifically for iOS installed PWA, while desktop keeps its useful sticky Save action.

## Database

**No Neon or database migration is required for V92.** This release changes presentation and PWA assets only. Existing deployments must already have the V85 and V90 migrations applied.

If App Health reports that required tables are missing with PostgreSQL code `42P01`, back up Neon and apply `neon-upgrade-v90-combined.sql` once. A connection or query failure now shows separate guidance and is not a reason to rerun SQL blindly.

## Deploy

1. Upload or connect the complete V92 source to Vercel.
2. Keep the same production environment variables used by V90/V91.
3. Deploy without running a new SQL script.
4. Open the deployed app once online, accept the update, then allow the app to reload so `miles-meals-static-v92-26` activates.
5. If an older installed icon remains, remove the old PWA once and install it again; operating systems can retain home-screen icon caches independently from Vercel.

## Validate locally

```bash
npm install
npm run v92:check
npm run v92-12:check
npm run v92-13:check
npm run v92-14:check
npm run v92-15:check
npm run v92-16:check
npm run v92-17:check
npm run v92-18:check
npm run v92-19:check
npm run v92-20:check
npm run v92-21:check
npm run v92-22:check
npm run v92-23:check
npm run v92-24:check
npm run v92-25:check
npm run v92-26:check
npm test
npm run build
```

Authenticated Playwright verification needs `E2E_EMAIL` and `E2E_PASSWORD`.

V92.25 packaging validation covers every historical and current release gate, TypeScript, source/route integrity and the 82-page Next.js production build. Receipt geometry also has a WebKit/Chromium specification; physical iPhone confirmation remains a deployed-staging gate.
