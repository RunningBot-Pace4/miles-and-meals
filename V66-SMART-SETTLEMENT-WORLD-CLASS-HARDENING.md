# v66 — Smart Settlement + Trust Hardening

v66 focuses on reducing settlement work after a trip while hardening the existing product for real group use. The existing ledger and payment-confirmation process remains unchanged.

## 1. Smart Settlement is recommendation-only

Smart Settlement reads the current remaining balances and suggests a smaller payment plan. It never rewrites expenses, split rows, payment records, or completed settlement history.

Example:

- JY owes JH RM50
- JH owes JY RM60
- Tan owes JY RM40

The explainable source relationships remain visible, while Smart Settlement recommends:

- JH → JY RM10
- Tan → JY RM40

That reduces three payment directions to two actual transfers without changing the ledger.

For normal travel groups with up to 11 non-zero participants, v66 runs an exact minimum-transfer search. For unusually large groups it uses a deterministic simplified settlement plan so the page stays responsive.

The Settle Up screen shows:

- outstanding payment directions before netting;
- recommended transfers after netting;
- number of transfers avoided;
- the current user's recommended moves;
- the whole-group recommendation;
- an expandable explanation of how the recommendation was calculated.

Already-sent and completed payments are deducted before the remaining plan is calculated.

## 2. Post-trip readiness prompt

One day after a trip end date, Home can surface a **Smart settlement ready** action when a remaining balance exists. The prompt links to Settle Up and explains how many transfers can be avoided.

This is a prompt only. Travelers can continue adding late expenses and can open Smart Settlement at any time.

## 3. Expense idempotency and interrupted-save recovery

New expenses use a client-generated UUID as the save request identity. If a network retry reaches the server more than once, the same request returns the existing expense instead of creating another one.

If a previous request created the expense record but was interrupted before split rows were available, the same request can repair the missing split rows rather than creating a duplicate.

The existing duplicate merchant/date/amount warning remains a separate user-facing safety layer.

## 4. Collaboration stale-edit protection

Expense and Planner edit forms send the server timestamp of the version the traveler opened. If another traveler changed the same record first, the later stale editor receives a 409 `STALE_EDIT` response and is asked to reload instead of silently overwriting newer data.

This protects the common multi-user last-write-wins problem without changing the existing permission model.

## 5. Offline conflict recovery

Offline mutations now retain:

- retry attempt count;
- last attempt time;
- last server/network error;
- whether the mutation is blocked and needs review.

Permanent/conflict-style responses such as 400/401/403/404/409/422 no longer retry forever in the background. The traveler sees a compact **needs attention** control and can review, retry, or discard the local change. Network failures remain automatically retryable.

## 6. Settlement action retry safety

`Mark paid` and `Confirm received` now tolerate harmless repeated requests. Existing pending/completed records are returned as idempotent success where appropriate, while a genuinely new later balance between the same travelers can still be settled.

## 7. Privacy and security hardening

Dashboard and settlement name lookups are scoped to participant IDs instead of loading the complete user directory.

Global response headers now include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: off`
- a restrictive `Permissions-Policy`
- production HSTS

The existing same-origin mutation checks, Better Auth rate limiting, server-side trip access checks, and role/privacy rules remain in place.

A strict CSP is intentionally not claimed in v66 because the current Next.js, MapLibre and OCR worker runtime needs integration testing before enforcing one without breaking the app.

## 8. Data integrity health checks

Admin consistency scans now also flag impossible settlement states:

- payer and receiver are the same traveler;
- settlement amount is zero/negative;
- a completed settlement is missing receiver-confirmation metadata;
- a pending settlement already contains confirmation metadata.

Historical travelers who were later removed from a trip are not treated as corrupt records; their old expense and settlement history remains valid.

## 9. Mobile and accessibility polish

Smart Settlement and offline recovery are mobile-first surfaces with compact cards, narrow-phone breakpoints, touch-friendly actions and polite live-region updates. The recommendation is intentionally kept separate from the existing payment buttons to reduce accidental financial actions.

## 10/10 engineering target checklist

| Product area | v66 engineering work toward the target |
| --- | --- |
| Trip architecture | Preserves single-country trip ownership/access rules and adds a post-trip settlement lifecycle without changing action scope. |
| Expense logic | Adds network-retry idempotency, interrupted-save recovery and stale-edit protection on top of multi-currency, OCR, splits and duplicate detection. |
| Settlement logic | Adds explainable minimum-transfer recommendations while preserving immutable completed history and receiver-confirmed completion. |
| Travel + money integration | Surfaces settlement readiness after travel and keeps trip/planner/expense scopes connected. |
| Mobile UX | Adds a dedicated mobile-first Smart Settlement hierarchy and reviewable offline recovery surface, building on the existing mobile expense redesign. |
| Collaboration | Rejects stale Expense/Planner edits and keeps activity/notification visibility so newer teammate changes are not silently overwritten. |
| Offline/recovery | Classifies retryable vs blocked changes and gives travelers explicit Retry/Discard recovery controls. |
| Reliability | Adds idempotent financial writes/actions, interrupted-save recovery, extra consistency checks and regression validators. |
| Security/privacy | Scopes participant identity lookups, retains server-side access checks and adds defensive response headers on top of Better Auth protections. |
| Product simplicity | Smart Settlement remains a report/recommendation instead of introducing a second competing payment workflow; advanced explanations stay collapsible. |

## Quality target

v66 is engineered toward a world-class product standard across every area previously identified as below target. The implementation target is 10/10 behavior: predictable taps, explainable money calculations, no silent overwrites, safe retries, recoverable offline errors, least-necessary data access and mobile-first presentation.

It should not be described as objectively “10/10” or “world #1” solely from static source checks. That claim requires production evidence: multi-device testing, real-user usability sessions, load/performance measurement, dependency/security scanning, accessibility testing and an external security review.

## Migration

No database schema migration is required from v65.1 to v66.

## Validation included in the package

- legacy v53–v65 regression validators;
- Phase 8 validator;
- Navigation validator;
- PWA validator;
- v66 Smart Settlement/trust validator;
- Smart Settlement unit test covering the JY/JH/Tan example;
- static TypeScript parser scan and local-import scan performed during packaging.

A full Next.js production build still requires project dependencies to be installed in the deployment environment.
