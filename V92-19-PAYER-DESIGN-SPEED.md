# V92.19 Payer Design and Speed

## Reported design corrections

- **One payer:** compact full-width traveller rows with avatar, name, selection explanation and a clear selected outline.
- **Multiple payers:** the same traveller-row language, with a contribution input added only to selected rows.
- **Contribution input:** currency and value are one two-column control. The currency cannot wrap vertically or become a separate bordered strip.
- **Split method:** Equal, %, Shares and Exact remain in one four-column control at every supported phone width.
- **Responsive behavior:** 320–360 px stacks a selected payer's contribution beneath the traveller; 361–719 px keeps a compact two-column layout; desktop retains a wider contribution column.

## Performance changes

| Area | V92.18 | V92.19 | Result |
|---|---:|---:|---:|
| Shared route CSS | 353,528 bytes | 340,733 bytes | −12,795 bytes (−3.6%) |
| Add Expense initial CSS + JS | 550,251 bytes | 544,248 bytes | −6,003 bytes |
| Saved-group request on page open | Always | Only when opened | One request avoided in the normal flow |
| Main navigation | Full document request | Prefetched client transition | Shared app layout remains mounted |
| Transition recovery | Native by default | Native after 4.5 s if stalled | Speed with PWA fallback |

The service worker keeps authenticated page and React Server Component requests network-only. A new `miles-meals-static-v92-20` cache ensures the installed PWA activates these assets as one coherent release.

## Validation

- 184/184 unit tests passed.
- Every historical V53–V92.18 gate plus the new V92.19 gate passed.
- Source integrity, route integrity and TypeScript passed.
- Next.js 16.2.12 production build compiled and generated all 82 static-build entries.
- Static responsive contracts cover 320, 360, 390, 430, 600, 719 and 1024 px.

Authenticated browser and physical-device confirmation still belongs in deployed staging because it requires real login data and installed browser binaries.

## Deployment

No database migration is required. Deploy the full source, then open the installed PWA online and accept the V92.19 update once so the new service-worker cache activates.
