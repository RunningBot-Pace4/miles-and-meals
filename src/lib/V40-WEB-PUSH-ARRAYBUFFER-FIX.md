# Miles & Meals v40 — Web Push ArrayBuffer Fix

## Build error fixed

The production TypeScript build failed at:

```text
applicationServerKey:
  base64UrlToUint8Array(publicKey)
```

because newer TypeScript typed arrays can carry an `ArrayBufferLike` backing
buffer, while the Push API typing requires a buffer source compatible with a
real `ArrayBuffer`.

## Fix

`NotificationSettings.tsx` now decodes the VAPID public key into a newly
allocated `ArrayBuffer` and returns that exact buffer:

```ts
function base64UrlToArrayBuffer(
  base64Url: string,
): ArrayBuffer {
  const padding = "=".repeat(
    (4 - (base64Url.length % 4)) % 4,
  );
  const base64 = (
    base64Url + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);

  for (
    let index = 0;
    index < raw.length;
    index += 1
  ) {
    output[index] = raw.charCodeAt(index);
  }

  return buffer;
}
```

The Push API call is now:

```ts
await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey:
    base64UrlToArrayBuffer(publicKey),
});
```

## Regression protection

`npm run phase8:check` now verifies that the Web Push VAPID decoder returns an
`ArrayBuffer`.

## Validation

```text
PWA: PASS
Navigation: PASS
Phase 8: PASS
Service worker syntax: PASS
Cleanup syntax: PASS
Phase 8 validator syntax: PASS

121 TS/TSX files scanned
0 syntax/parse errors
0 nullability diagnostics
0 Push ArrayBuffer diagnostics
0 missing local imports

Dedicated PushManager.subscribe ArrayBuffer type-check: PASS
```

## Upgrade

No database migration is introduced by v40.

If the Phase 8 v38 database tables have already been pushed, do not run another
migration specifically for v40.

Run:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run cleanup:legacy
npm run phase8:check
npm test
npm run build
```
