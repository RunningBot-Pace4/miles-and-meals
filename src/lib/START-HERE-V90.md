# Start here — V90 Combined

This package combines V86 through V90 as Miles & Meals `1.90.0`.

## Upgrade

1. Create a Neon backup or branch.
2. If the deployed database is older than V85, run `neon-upgrade-v85-combined.sql` first.
3. Run `neon-upgrade-v90-combined.sql` in Neon SQL Editor.
4. Deploy the complete source package.
5. Sign in as admin and open **More → App health & V90 readiness**.

Never run a reset SQL file as an upgrade. The reset scripts are destructive and are only for intentionally clearing application data.

## Verify

```bash
npm ci
npm run release:check
npm run build
```

For authenticated mobile verification:

```bash
E2E_EMAIL='your-test-user@example.com' \
E2E_PASSWORD='your-test-password' \
npm run test:e2e
```

The E2E suite covers 320, 360, 375, 390, 412 and 430 px phone widths. Use a non-production test account and test database.

## Product boundaries retained

- A Trip has exactly one destination country.
- A Journey only groups multiple Trips; each Trip keeps its own currency, expenses and Plan.
- Closed Trips are view-only everywhere.
- Invite links and QR codes are valid for 12 hours.
- Offline changes always sync to the original Trip and cannot be reassigned while queued.
- Trip Inbox, Bookings & Reservations and unreliable flight-number guessing remain removed.
- Miles & Meals remains a mobile web/PWA product; no native wrapper is included.

See `V90-COMBINED-WORLD-CLASS-TARGET.md` for the complete scorecard and the evidence required before making a global top-10 claim.
