# Miles & Meals v77 — Final Release Gate

This package consolidates v71 through v77 on top of v70 and remains a mobile-friendly web/PWA release.

## Final hardening included

- Safe same-origin auth return-path sanitizer rejects protocol-relative, encoded and backslash redirect tricks.
- Invite tokens are random, hashed at rest, expiring, usage-limited and revocable. Invite acceptance uses membership + atomic invite-use guards.
- Journey views never expose linked Trip metadata after the traveler loses that Trip membership.
- Journey start/end dates are server validated.
- Sign-out clears private offline pack/queue/draft data after warning about unsynced changes.
- Trip Inbox never persists the raw imported email/PDF/OCR body.
- Trip Inbox Add to Plan uses the Inbox UUID as a stable Planner idempotency key, so retries/double taps cannot create duplicate reservations.
- Best-effort PDF extraction refuses unreadable/compressed content and asks for a screenshot/photo instead of parsing binary garbage.
- Receipt itemization reconciles stored item rows and traveler splits to the exact final base-currency cents, including awkward FX rounding.
- Existing itemization is restored when editing an expense rather than silently disappearing.
- Locale and time-zone values are restricted to supported values.
- v77 service-worker/PWA validation accepts the intentionally bumped v77 cache generation while retaining old regression coverage.

## Validation completed in the packaging environment

- PWA validation: PASS
- Navigation reliability: PASS
- Phase 8 validation: PASS
- v53 through v70 regression validators: PASS
- v71–v77 validator: PASS
- Route integrity: 31 page routes / 200 source files: PASS
- Source integrity: 218 TS/TSX files / 0 parse errors / 0 missing local imports: PASS
- Additional pure-logic test: safe redirects + booking parser/PDF fallback + **5,000 randomized receipt-itemization reconciliation cases**: PASS
- ZIP integrity: checked during final packaging

## Dependency-backed build status

The source package intentionally excludes `node_modules`. The packaging environment attempted `npm install`, but DNS access to the npm registry failed with `EAI_AGAIN`. Because dependencies could not be installed, this environment cannot truthfully claim that `npm test`, the full strict `tsc --noEmit`, Playwright, or `next build` completed here.

Before deployment run in your normal environment:

```bash
npm install
npm run db:push
npm run release:check
npm run build
```

For browser E2E after a staging deployment, configure the test credentials required by the existing Playwright suite and run:

```bash
npm run test:e2e
```

## Upgrade rule

Take a Neon backup/branch first. v77 introduces schema changes, so upgrading from v70 requires `npm run db:push`. Do not use either reset command for an upgrade.
