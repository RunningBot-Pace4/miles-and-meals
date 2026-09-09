# V96 — Production Readiness Hardening

> Historical planning document, not a certification of this ZIP. See
> DEPLOY-VERCEL.md for the verified build and current deployment instructions.
> This source pins Next.js 16.2.12, not 16.3.4. The `v96:check` and
> `v96:purge-sensitive-docs` commands below are not present in package.json;
> do not run them. The release and purge procedures below remain unverified plans.

V96 is a launch-hardening release on top of V95. It does not add a new product area.

## Security and privacy

- Next.js is pinned to 16.3.4.
- Planner links accept/render only HTTP(S).
- Document external links require HTTPS.
- New PASSPORT/VISA/MEDICAL files cannot be stored as database blobs; use a secure HTTPS link.
- Legacy sensitive blobs are withheld from normal document APIs, offline packs, and new admin backups.
- Admin health reports `SENSITIVE_DOCUMENT_BLOB_PRESENT` until legacy sensitive blobs are migrated/purged.
- Payment proof is visible only to payer, receiver, Trip Owner, or system admin.
- Settlement ledger queries a proof-presence boolean instead of loading proof image blobs.
- Production public signup fails closed without transactional-email configuration. When configured, email verification is required.
- Authenticated navigation is no longer forced to disable browser zoom.
- A protected retention endpoint deletes expired location/telemetry/audit rows using configurable windows.

## Data integrity health checks

V96 extends the consistency report to check:

- missing/mismatched expense payer totals;
- expense split/payer country membership;
- orphan, invalid, cross-scope, and over-allocated settlement allocations;
- unsupported payment methods;
- malformed/oversized payment proof;
- legacy sensitive document blobs.

## PWA / IA cleanup

- App metadata points to `/manifest.webmanifest`.
- The canonical manifest keeps V95 `Add` and `Spend` shortcuts.
- Older versioned manifests remain only for backward compatibility with already-installed clients.

## Production environment

Required for public signup:

```env
RESEND_API_KEY=...
EMAIL_FROM="Miles & Meals <noreply@example.com>"
```

Required for scheduled retention:

```env
CRON_SECRET=...
```

Optional retention windows:

```env
RETENTION_LOCATION_DAYS=30
RETENTION_METRICS_DAYS=90
RETENTION_ERRORS_DAYS=90
RETENTION_LOGIN_AUDIT_DAYS=180
RETENTION_PRODUCT_EVENT_DAYS=90
```

## Legacy sensitive documents

Before a public launch:

1. Review the admin consistency report for `SENSITIVE_DOCUMENT_BLOB_PRESENT`.
2. Move any required PASSPORT/VISA/MEDICAL files to private encrypted storage outside the main PostgreSQL database and save only a secure HTTPS reference.
3. Purge the legacy database blobs intentionally:

```bash
PURGE_SENSITIVE_DOCUMENT_BLOBS=YES npm run v96:purge-sensitive-docs
```

The command refuses to run without the explicit confirmation variable.

## Deployment

```bash
npm install
npm run db:push
npm run v96:check
npm run release:check
npm run test:e2e
```

Because this build environment cannot reach npm, the Next.js lock metadata was updated from published 16.3.4 package metadata, but a connected release environment should still run `npm install` once and commit any resulting lock normalization before the final `npm ci` deployment.

## Release gate

Public beta is GO only when:

- V96 and legacy release validators pass;
- full TypeScript, unit, build, and Playwright tests pass with installed dependencies;
- production signup sends and verifies a real email;
- admin consistency health is green;
- no sensitive document blobs remain;
- payment-proof access is verified with payer/receiver/bystander accounts;
- the pre-launch matrix in `PRE-LAUNCH-TEST-MATRIX-V96.md` has no open P0/P1 failures.
