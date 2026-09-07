import {
  existsSync,
  rmSync,
} from "node:fs";
import path from "node:path";

const obsoletePaths = [
  "src/app/api/receipts/upload",
  "src/app/api/receipts/analyze",
  "src/lib/receipt-storage.ts",

  // Legacy password-reset UI from older source overlays.
  // Current recovery is admin-assisted via /forgot-password.
  "src/components/ForgotPasswordForm.tsx",
  "src/components/ResetPasswordForm.tsx",
  "src/app/reset-password",

  // V92.22 consolidated the two root loading boundaries into the
  // authenticated route-group boundary below. Full-source ZIPs extracted over
  // an existing checkout cannot delete this retired file by themselves, so a
  // stale copy would make the V92.22 release gate fail on Vercel.
  "src/app/loading.tsx",

  // V92.26 retired the automatic route-recovery fallback. Source archives
  // extracted over V92.25 cannot delete the old module, so remove a stale
  // copy before the V92.25 and V92.26 release gates inspect the tree.
  "src/lib/route-recovery.ts",
  "tests/v92-25-1-deployment-id.test.ts",
  "scripts/validate-v92-25-1.mjs",

  // A repository/archive uploaded while the destination was src/lib can
  // create a second project tree below the real library directory. These
  // paths are never part of the application and make navigation and
  // TypeScript validators scan duplicate source and test files.
  "src/lib/src",
  "src/lib/tests",
  "src/lib/scripts",
  "src/lib/public",
  "src/lib/e2e",
  "src/lib/.next",
  "src/lib/node_modules",
  "src/lib/package.json",
  "src/lib/package-lock.json",
  "src/lib/next.config.ts",
  "src/lib/next-env.d.ts",
  "src/lib/tsconfig.json",
  "src/lib/drizzle.config.ts",
  "src/lib/playwright.config.ts",
  "src/lib/vitest.config.ts",
  "src/lib/eng.traineddata",
  "src/lib/vie.traineddata",
  "src/lib/design-preview.html",

  // v82 retired Trip Inbox, booking/reservation import and live flight lookup.
  // Full-source ZIPs are sometimes extracted over an older checkout, which
  // does not delete files that disappeared from the new package. Remove those
  // stale routes before validators and Next route discovery run.
  "src/app/(app)/inbox",
  "src/app/api/trip-inbox",
  "src/app/api/flight-lookup",
  "src/components/TripInboxClient.tsx",
  "src/lib/booking-parser.ts",
  "src/lib/flight-schedule.ts",
  "tests/flight-schedule.test.ts",
];

for (const relativePath of obsoletePaths) {
  const absolutePath = path.join(
    process.cwd(),
    relativePath,
  );

  if (!existsSync(absolutePath)) {
    continue;
  }

  rmSync(absolutePath, {
    recursive: true,
    force: true,
  });

  console.log(
    `[Miles & Meals] Removed legacy file: ${relativePath}`,
  );
}
