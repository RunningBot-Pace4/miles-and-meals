import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const fail = (message) => failures.push(message);

const css = read("src/app/globals.css");
const tripManager = read("src/components/TripManager.tsx");
const budgetGate = read("src/components/BudgetAccessGate.tsx");
const budgetApi = read("src/app/api/budgets/route.ts");
const appLayout = read("src/app/(app)/layout.tsx");
const onboarding = read("src/app/onboarding/budget/page.tsx");
const tripApi = read("src/app/api/trips/route.ts");
const tripPage = read("src/app/(app)/trips/page.tsx");
const access = read("src/lib/access.ts");
const assignmentRoute = read(
  "src/app/api/trips/[id]/countries/[countryId]/members/route.ts",
);
const push = read("src/lib/push.ts");

if (
  !css.includes("max-content") ||
  !css.includes("min-width: 44px") ||
  !css.includes("white-space: nowrap")
) {
  fail("Trip Owner status must stay on one line in the traveler row.");
}

if (
  !tripManager.includes("travelerBusy") ||
  !tripManager.includes('title={') ||
  !tripManager.includes('"Adding traveler"') ||
  !tripManager.includes("preparing their travel wallet")
) {
  fail("Traveler assignment must show a blocking/loading state.");
}

if (
  !budgetGate.includes("BUDGET_POLL_INTERVAL_MS") ||
  !budgetGate.includes('fetch(\n          "/api/budgets"') ||
  !budgetGate.includes('"/onboarding/budget"') ||
  !budgetGate.includes('"/api/active-trip"') ||
  !budgetApi.includes("export async function GET") ||
  !budgetApi.includes("listMissingTripBudgets")
) {
  fail("Assigned travelers must be detected live and sent to budget onboarding without refresh.");
}

if (
  !appLayout.includes("missingBudgets[0]?.tripId") ||
  !appLayout.includes("listMissingTripBudgets") ||
  !onboarding.includes("listMissingTripBudgets")
) {
  fail("Budget prompting must use all accessible trips and preserve the newly assigned trip context.");
}

if (
  !assignmentRoute.includes('"TRIPS"') ||
  !assignmentRoute.includes("budgetPrompt") ||
  !assignmentRoute.includes("tripBudgets") ||
  !push.includes('| "TRIPS"')
) {
  fail("Trip assignment must create a trip notification and only request budget setup when needed.");
}

if (
  !tripApi.includes("ensureTripOwnerAccess") ||
  !tripApi.includes("ownerAssigned: true") ||
  !access.includes("ensureTripOwnerAccess") ||
  !access.includes('role: "OWNER"') ||
  !access.includes("repairOwnedTripAccess") ||
  !tripPage.includes("repairOwnedTripAccess")
) {
  fail("Trip creators, including System Admins, must be persisted and self-healed as Owner + traveler.");
}

if (
  !tripManager.includes("created.ownerAssigned !== true") ||
  !tripManager.includes('"/api/active-trip"') ||
  !tripManager.includes('window.location.replace(\n        "/onboarding/budget"')
) {
  fail("Newly created trips must become the creator's active trip and open budget setup.");
}

if (failures.length) {
  console.error("v56 validation failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("v56 owner row + live budget prompt + creator assignment validation passed.");
