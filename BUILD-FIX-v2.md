# Miles & Meals — Forgot Password Build Fix v2

This is the complete application source.

## Fixed

`src/lib/auth.ts` now declares `sendResetPassword` as an `async` callback so
it conforms to Better Auth's `Promise` return type while retaining Next.js
`after()` for serverless email delivery.

## Verify

```powershell
npm install
npm run build
```

Then commit and push this complete project to GitHub.
