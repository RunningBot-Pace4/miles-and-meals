# Miles & Meals v53 — Auto Settlement Completion + Notification Repair

## 1. Receiver confirmation completes both sides

When the receiver selects **Mark received** or **Confirm received**, the settlement becomes `SETTLED` immediately.

The payer does not need to press **Mark paid** afterward. The payer view updates automatically through the existing live settlement refresh, and the payer receives a completed-payment notification.

This also works when the receiver confirms receipt before the payer has ever selected Mark paid.

## 2. Notification reliability repair

The v52 reconstructed source package referenced PWA image files that were not included in `public/`. The service worker pre-caches those files with `cache.addAll()`, so a missing asset can prevent the service worker from installing. That also prevents Web Push from becoming ready.

v53 restores the required PWA assets and manifest and bumps the service worker cache to `miles-meals-static-v53`.

## 3. In-app notification center is independent of Web Push

In-app notification records are now created before browser push preference/configuration checks. The top-right bell and Notification Center therefore continue working even if:

- browser notification permission is not granted,
- VAPID is not configured,
- the device has no push subscription, or
- push alerts for a category are disabled.

Push preference switches now control device push alerts only. In-app history remains available.

## 4. Safer device setup

Notification settings now:

- check the current device rather than another device's saved subscription,
- register `/sw.js` if necessary,
- stop with a clear error instead of waiting forever if the service worker cannot become ready,
- keep a separate **Notification Center — Always available** status.

## 5. Faster in-app refresh

The notification bell and Notification Center refresh every 5 seconds while the app is open, instead of every 15 seconds.

## Validation

Run:

```powershell
npm run pwa:check
npm run navigation:check
npm run phase8:check
npm run v53:check
npm test
npm run build
```

No database migration is required for v53.
