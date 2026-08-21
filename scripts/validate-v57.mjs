import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const fail = (message) => failures.push(message);

const dashboard = read("src/app/(app)/dashboard/page.tsx");
const tripSelect = read("src/components/TripQuickSelect.tsx");
const allTrips = read("src/components/AllTripsOverview.tsx");

if (
  !tripSelect.includes('View all trips') ||
  !tripSelect.includes('ALL_TRIPS_VALUE') ||
  !tripSelect.includes('/dashboard?view=all') ||
  !tripSelect.includes('viewAll')
) {
  fail("Home trip dropdown must include a View all trips mode.");
}

if (
  !dashboard.includes('query.view === "all"') ||
  !dashboard.includes('viewAll={viewAll}') ||
  !dashboard.includes('? "All trips"') ||
  !dashboard.includes('selectedTrip && !viewAll')
) {
  fail("Dashboard must render all-trip and single-trip modes from the same selector.");
}

if (
  allTrips.includes('Your travel overview') ||
  allTrips.includes('id="all-trips-title"')
) {
  fail("The separate Your travel overview heading must be removed.");
}

if (!dashboard.includes(') : viewAll ? null : (')) {
  fail("Trip-specific finance/settlement panels must stay hidden in all-trip mode.");
}

if (failures.length) {
  console.error("v57 validation failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("v57 Home View all dropdown validation passed.");
