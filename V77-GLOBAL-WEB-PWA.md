# Miles & Meals v77 — Global Web/PWA Foundation

v77 remains a **responsive mobile web + PWA** release. No separate native iOS/Android codebase is introduced.

Enhancements include locale and time-zone preferences, invite deep links, locally generated QR invites, updated PWA shortcuts, mobile styling for Journeys/Trip Inbox/Offline 2.0/payment tools, and v71–v77 backup/reset coverage.

## Upgrade from v70

v77 adds database tables/columns. Back up Neon first, then run:

```bash
npm install
npm run db:push
npm run release:check
npm run build
```

Do not run the reset command for an upgrade.


## Final release hardening

The final v77 package also includes invite revoke/concurrency safeguards, signed-out offline-data cleanup, privacy-minimal Trip Inbox persistence, idempotent Inbox → Plan promotion, exact itemization cent reconciliation, edit-time itemization restoration, and supported-value validation for regional settings.

See `V77-FINAL-RELEASE-GATE.md` for the final validation record.
