import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const fail = (message) => failures.push(message);

const dashboard = read("src/app/(app)/dashboard/page.tsx");
const tripSelect = read("src/components/TripQuickSelect.tsx");
const finance = read("src/components/LiveDashboardFinance.tsx");
const settlements = read("src/components/LiveSettlementWorkspace.tsx");
const financeApi = read("src/app/api/dashboard/finance/route.ts");
const settlementApi = read("src/app/api/settlements/summary/route.ts");
const scope = read("src/lib/dashboard-scope.ts");

if (
  !dashboard.includes('query.view !== "trip"') ||
  !dashboard.includes('viewAll\n      ? "All trips"') ||
  dashboard.includes("<AllTripsOverview")
) {
  fail("Home must default to View all trips and use the normal dashboard layout instead of a separate overview.");
}

if (
  !tripSelect.includes('"/dashboard"') ||
  !tripSelect.includes('"/dashboard?view=trip"')
) {
  fail("View all must be the default Home URL while explicit trip selection uses the individual-trip mode.");
}

if (
  !dashboard.includes("allTrips={viewAll}") ||
  !finance.includes('scope=all') ||
  !settlements.includes('query.set("scope", "all")')
) {
  fail("All-trip Home must keep the same live finance and settlement panels.");
}

if (
  !financeApi.includes('url.searchParams.get("scope") === "all"') ||
  !settlementApi.includes('url.searchParams.get("scope") === "all"') ||
  !scope.includes("loadAllTripsDashboardData") ||
  !scope.includes("getConversionRate")
) {
  fail("All-trip data must be aggregated server-side, including mixed base-currency conversion support.");
}

if (failures.length) {
  console.error("v58 validation failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("v58 default all-trips same-screen Home validation passed.");
