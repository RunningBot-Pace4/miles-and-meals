import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const css = read("src/app/v92-living-journey.css");
const offline = read("src/components/OfflinePackWorkspace.tsx");
const permissions = read("src/components/TripPermissionsManager.tsx");
const budgets = read("src/components/CategoryBudgetManager.tsx");
const categoryApi = read("src/app/api/category-budgets/route.ts");
const queue = read("src/components/OfflineQueueSync.tsx");
const audit = read("e2e/v92-9-full-pwa-audit.spec.ts");
const geometry = read("e2e/v92-15-mobile-control-layout.spec.ts");

must(packageJson, '"version": "1.92.17"', "V92.15 package version missing");
must(packageJson, '"v92-15:check"', "V92.15 validation script missing");
must(packageJson, "npm run v92-15:check", "V92.15 validation is not in the build gate");
must(worker, "miles-meals-static-v92-17", "V92.15 PWA cache missing");

for (const marker of [
  "/* V92.15 · compact mobile controls",
  ".offline-share-native-control",
  ".offline-share-check",
  ".permission-owner-summary",
  ".permission-native-control",
  ".category-budget-access",
  ".category-budget-money-input",
  "minmax(52px, auto)",
  "padding-bottom: calc(8.5rem + env(safe-area-inset-bottom))",
]) must(css, marker, `V92.15 responsive CSS missing: ${marker}`);

for (const marker of ["offline-share-native-control", "offline-share-check", "offline-share-name"]) {
  must(offline, marker, `Offline sharing control missing: ${marker}`);
}

for (const marker of ["permission-owner-summary", "permission-check", "permission-access-icon", "permission-access-copy", "Only the Trip Owner can change traveler permissions."]) {
  must(permissions, marker, `Permission repair missing: ${marker}`);
}

for (const marker of ["editingEnabled", "Editing enabled", "Save limit", "category-budget-money-input"]) {
  must(budgets, marker, `Category editing repair missing: ${marker}`);
}

for (const marker of ["categoryOrder.map((category)", 'Accommodation: "Hotel"', 'Activities: "Attractions"']) {
  must(categoryApi, marker, `Category-spending normalization missing: ${marker}`);
}
must(queue, "canonicalExpenseCategory", "Queued legacy expense categories are not normalized for editing");

must(audit, "oversizedBooleanControls", "Full route audit does not detect oversized boolean controls");
for (const marker of ["shareSeparated", "permissionSeparated", "permissionCopyHasRoom", "prefixFits", "saveInside"]) {
  must(geometry, marker, `V92.15 geometry check missing: ${marker}`);
}

console.log("V92.15 compact PWA controls and category editing gate passed.");
