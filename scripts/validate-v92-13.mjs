import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");
const must = (
  source,
  marker,
  message,
) => {
  if (!source.includes(marker)) {
    throw new Error(message);
  }
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const css = read(
  "src/app/v92-living-journey.css",
);
const finance = read(
  "src/components/LiveDashboardFinance.tsx",
);
const geometry = read(
  "e2e/v92-12-pwa-layout.spec.ts",
);

must(
  packageJson,
  '"version": "1.92.25"',
  "V92.13 package version missing",
);
must(
  packageJson,
  '"v92-13:check"',
  "V92.13 validation script missing",
);
must(
  packageJson,
  "npm run v92-13:check",
  "V92.13 validation is not in the build gate",
);
must(
  worker,
  "miles-meals-static-v92-25",
  "V92.13 PWA cache missing",
);

for (const marker of [
  "/* V92.13 · intentional three-card wallet geometry",
  ".dashboard-budget-section .travel-section-heading.compact",
  "grid-template-columns: minmax(0, 1fr) auto !important",
  ".dashboard-budget-section .travel-stat:first-child",
  "grid-column: 1 / -1",
  "@media (max-width: 360px)",
  "@media (min-width: 641px) and (max-width: 819px)",
]) {
  must(
    css,
    marker,
    `Wallet responsive marker missing: ${marker}`,
  );
}

for (const label of [
  "My budget",
  "My share spent",
  "My remaining",
  "Combined budget",
  "Trip expenses",
  "Group remaining",
]) {
  must(
    finance,
    `label="${label}"`,
    `Wallet value missing: ${label}`,
  );
}

for (const marker of [
  "budgetHeadingSameRow",
  "firstBudgetCardIsFeatured",
  "lowerBudgetCardsShareRow",
  "allBudgetCardsShareRow",
]) {
  must(
    geometry,
    marker,
    `Wallet geometry assertion missing: ${marker}`,
  );
}

console.log(
  "V92.13 mobile wallet-card geometry validation passed.",
);
