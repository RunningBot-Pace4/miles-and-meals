# Miles & Meals — verified build fix

Latest Home/navigation update: see HOME-REFRESH-AND-NAVIGATION.md. Production
build and 254 tests passed; no SQL changes are required.

Latest update: email verification removed. Use EMAIL-LOGIN-AND-RESET.md for
login changes and database/RESET-APP-DATA-KEEP-ACCOUNTS.sql for optional cleanup.

## Payment history and navigation update

This package also includes the changes in PAYMENT-HISTORY-UPDATE.md.
Latest unit result: 246 passed, 4 database integration tests skipped.
No SQL migration is required for this update; it uses existing allocations.

## What was fixed

- `scripts/validate-v95.mjs` expected the retired `canAccessCountry` marker.
  It now checks the current payer/receiver/trip-manager proof restriction and
  private/no-store response. The validator remains part of the build.
- The proof route explicitly returns ArrayBuffer-backed bytes compatible with
  TypeScript's Response body type. PNG/WebP filenames now match the image type;
  the filename no longer interpolates a request parameter.
- Added 12 route tests covering authentication, missing payments, payer,
  receiver, manager, unrelated users, absent/invalid proof, MIME type and headers.
- Updated three obsolete tests to reflect explicit bill allocations, the
  canonical manifest and accessible browser zoom. No product features removed.
- Added missing email environment examples and ignore rules for local secrets,
  test reports, logs, TypeScript cache and root OCR cache files.
- Marked the historical V96 readiness document as an unverified plan: its
  dependency version and commands do not describe this source package.

## Verification

- Node 24.19.0; npm 11.9.0; locked Next.js 16.2.12.
- Clean dependency installation completed (`npm ci --ignore-scripts`), then
  the asset-copy script ran through prebuild.
- `npm run build`: passed, including all prebuild validators, route/source
  integrity, TypeScript, optimized compilation and page generation.
- `npm test`: 241 passed; 4 database integration tests skipped because
  TEST_DATABASE_URL was not configured.
- Build used dummy database/auth settings, never the uploaded production .env.
  This proves compilation, not production DB connectivity or authenticated flows.
- No production data, schema, account or remote repository was changed.
- Browser E2E/visual tests were not run: the Chromium download timed out.
  The full authenticated/mobile/PWA release matrix is not certified by this fix.

## Apply to your existing repository

1. Back up your current checkout and commit any work you want to keep.
2. Extract this ZIP outside your repository. Copy the CONTENTS of its
   `miles-and-meals` folder into your existing project root, replacing matching
   source files. Do not create a nested miles-and-meals/miles-and-meals project.
3. Keep your existing local `.env` and `.git` folder. They are deliberately not
   in this delivery. Never commit .env or credentials.
4. Review the changed files in your Git client, commit them, and push to the
   branch connected to your existing Vercel project. The original error requires
   the changed validator as well as the changed proof route.

Optional local verification, from the directory containing package.json:

```sh
npm ci
npm test
npm run build
```

Your local .env must supply valid application configuration. Do not use the
dummy build settings from the verification environment in a real deployment.

## Vercel settings

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Node.js | 24.x (already pinned in package.json) |
| Install command | npm ci |
| Build command | npm run build |
| Output directory | Next.js default; no custom override |
| Root directory | Directory containing package.json and src |

Keep DATABASE_URL and BETTER_AUTH_SECRET in Vercel environment settings. Set
BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL to your real HTTPS application origin.
Use separate preview configuration and a test DB when testing preview deployments.

Email verification is disabled in this update. Existing users can sign in
without verifying their email, and signup no longer requires RESEND_API_KEY or
EMAIL_FROM. See EMAIL-LOGIN-AND-RESET.md for the optional account-preserving reset.

This fix does NOT need a new SQL migration. If your database has never received
the existing V93–V95 schema changes, review the scripts in database/ against a
backup/test branch first. Do not run db:push or any db:reset command blindly.

After the commit deploys, check login, selected-trip navigation, Add/Spend,
partial bill payments and proof access with payer/receiver/bystander accounts.
Test installed-PWA offline resync and verify the production admin health report.
These live checks and database integration tests remain release requirements.

## Package cleanup

The delivery excludes local .env secrets, Git history, node_modules, build
output, editor state, logs, test reports and root OCR runtime caches. Required
browser OCR assets, database scripts, source, lockfile and historical docs remain.
Nothing was deleted from your original upload or your local computer.

## Official references

- [Vercel build settings](https://vercel.com/docs/builds/configure-a-build)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
