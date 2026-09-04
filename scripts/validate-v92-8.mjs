import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const css = read("src/app/v92-living-journey.css");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const halo = read("src/components/LivingJourneyHalo.tsx");
const expense = read("src/components/ExpenseForm.tsx");
const login = read("src/components/LoginForm.tsx");

must(packageJson, '"version": "1.92.21"', "V92.8 package version missing");
must(packageJson, '"v92-8:check"', "V92.8 validation script missing");
must(packageJson, "npm run v92-8:check", "V92.8 validation is not in the build gate");
must(worker, "miles-meals-static-v92-21", "V92.8 service-worker cache missing");

must(expense, 'aria-pressed={category === item.value}', "Expense category selection is not exposed");
must(expense, 'className="split-preset-details"', "Optional saved split is not collapsed");
must(expense, "remembers who shares, not the amount", "Saved split purpose is not explained");
must(login, "PasswordVisibilityIcon", "Login password still lacks an eye icon");

must(halo, 'className="journey-context-strip"', "Trip context was not merged into the command centre");
must(halo, "props.myShareSpent", "Halo does not show aggregate personal spend");
must(halo, "props.tripGroupSpend", "Halo does not show aggregate group spend");
if (dashboard.includes("living-journey-trip-hero")) {
  throw new Error("The redundant lower dashboard hero still renders");
}

[
  "/* V92.8 · compact entry and one connected Home",
  '.category-chip[aria-pressed="true"]',
  ".split-preset-details {",
  ".settlement-panel > .panel-title {",
  'grid-template-areas: "icon copy amount action"',
  ".journey-context-strip {",
  ".journey-wallet-summary {",
].forEach((marker) => must(css, marker, `V92.8 usability marker missing: ${marker}`));

console.log("V92.8 compact controls, settlement and consolidated Home validation passed.");
