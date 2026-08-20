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
