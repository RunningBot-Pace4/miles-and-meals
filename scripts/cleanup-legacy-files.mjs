import {
  existsSync,
  rmSync,
} from "node:fs";
import path from "node:path";

const obsoletePaths = [
  "src/app/api/receipts/upload",
  "src/lib/receipt-storage.ts",
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
