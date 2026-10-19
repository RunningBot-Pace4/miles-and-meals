import {
  existsSync,
  rmSync,
} from "node:fs";
import path from "node:path";

const obsoletePaths = [
  // Retired photo/video gallery modules: remove stale files from source ZIP overlays.
  "PERSONAL-GALLERY.md",
  "SHARED-GALLERY-SETUP.md",
  "neon-shared-media.sql",
  "scripts/cleanup-shared-media.ts",
  "src/app/(app)/my-gallery/page.tsx",
  "src/app/(app)/shared-gallery/page.tsx",
  "src/app/api/shared-media/[id]/route.ts",
  "src/app/api/shared-media/complete/route.ts",
  "src/app/api/shared-media/route.ts",
  "src/app/api/shared-media/upload/route.ts",
  "src/components/PersonalGallery.module.css",
  "src/components/PersonalGallery.tsx",
  "src/components/SharedGallery.module.css",
  "src/components/SharedGallery.tsx",
  "src/lib/personal-gallery.ts",
  "src/lib/shared-media-server.ts",
  "src/lib/shared-media.ts",
  "tests/personal-gallery.test.ts",
  "tests/shared-media-access.test.ts",
  "tests/shared-media-callback-signature.test.ts",
  "tests/shared-media-completion.test.ts",
  "tests/shared-media-reservations.test.ts",
  "tests/shared-media-upload.test.ts",
  "tests/shared-media.test.ts",

  "src/app/api/receipts/upload",
  "src/app/api/receipts/analyze",
  "src/lib/receipt-storage.ts",

  // Legacy password-reset UI from older source overlays.
  // Current recovery is admin-assisted via /forgot-password.
  "src/components/ForgotPasswordForm.tsx",
  "src/components/ResetPasswordForm.tsx",
  "src/app/reset-password",

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
