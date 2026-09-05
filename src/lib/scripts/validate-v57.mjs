import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const fail = (message) => failures.push(message);

const tripSelect = read("src/components/TripQuickSelect.tsx");
const dashboard = read("src/app/(app)/dashboard/page.tsx");

if (
  !tripSelect.includes("View all trips") ||
  !tripSelect.includes("ALL_TRIPS_VALUE") ||
  !tripSelect.includes("viewAll")
) {
  fail("Home trip dropdown must retain a View all trips mode.");
}

if (
  !dashboard.includes("viewAll={viewAll}") ||
  !dashboard.includes('? "All trips"')
) {
  fail("Dashboard must retain all-trip and single-trip modes from the same selector.");
}

if (dashboard.includes("<AllTripsOverview")) {
  fail("The retired separate all-trip card overview must not render on Home.");
}

if (failures.length) {
  console.error("v57 validation failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("v57 Home View all dropdown compatibility validation passed.");
