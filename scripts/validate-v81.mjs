import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

const packageJson = read("package.json");
const parser = read("src/lib/booking-parser.ts");
const flightApi = read("src/app/api/flight-lookup/route.ts");
const flightNormalizer = read("src/lib/flight-schedule.ts");
const close = read("src/lib/financial-close.ts");
const planner = read("src/components/PlannerClient.tsx");
const budget = read("src/components/TripBudgetForm.tsx");
const inbox = read("src/components/TripInboxClient.tsx");
const offlineApi = read("src/app/api/offline-pack/route.ts");
const offlineStore = read("src/lib/offline-pack.ts");
const offlineWarmup = read("src/components/OfflinePackWarmup.tsx");
const offlineShell = read("public/offline.html");
const css = read("src/app/globals.css");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.81.0"', "v81 package version missing");
must(packageJson, '"v81:check"', "v81 validator command missing");

for (const marker of ["departureDateTime", "BOOKING\\s*DATE", "MONTH_NUMBER", "clockTime"]) {
  must(parser, marker, `departure-aware booking parser missing: ${marker}`);
}
for (const marker of ["AVIATIONSTACK_API_KEY", 'searchParams.set("flight_date", date)', "No exact schedule"]) {
  must(flightApi, marker, `exact-date flight lookup missing: ${marker}`);
}
must(flightNormalizer, "localDateTime", "flight local-time normalization missing");

for (const marker of ["closedTripReadOnlyResponse", "TRIP_CLOSED_READ_ONLY", "Trip is closed and read-only"]) {
  must(close, marker, `closed-Trip write barrier missing: ${marker}`);
}
for (const marker of [planner, budget, inbox]) {
  must(marker, 'financialStatus === "CLOSED"', "closed-Trip UI read-only state missing");
}

must(offlineApi, 'parameters.get("all") === "1"', "all-Trip offline endpoint missing");
must(offlineStore, "writeOfflinePacks", "atomic multi-Trip offline storage missing");
must(offlineWarmup, 'offline-pack?all=1', "automatic all-Trip offline warmup missing");
for (const marker of ["repeat(2,minmax(0,1fr))", "@media(max-width:640px)", "ALL TRIPS"]) {
  must(offlineShell, marker, `standalone offline mobile containment missing: ${marker}`);
}
for (const marker of ["v81 — closed-Trip states", 'input[type="date"]', "grid-template-columns: minmax(0, 1fr) !important"]) {
  must(css, marker, `v81 mobile containment missing: ${marker}`);
}
must(worker, 'miles-meals-static-v81', "v81 service-worker cache bump missing");

console.log("v81 flight accuracy, closed-Trip, all-Trip offline and mobile validation passed.");
