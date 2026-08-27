import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const typesOnly = process.argv.includes("--types");
const targets = typesOnly
  ? [".next/types", ".next/dev/types"]
  : [".next"];

for (const relativePath of targets) {
  const target = resolve(root, relativePath);

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`Removed stale Next output: ${relativePath}`);
  }
}
