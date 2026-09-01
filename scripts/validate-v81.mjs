import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

const packageJson = read("package.json");
const close = read("src/lib/financial-close.ts");
const planner = read("src/components/PlannerClient.tsx");
const budget = read("src/components/TripBudgetForm.tsx");
const offlineApi = read("src/app/api/offline-pack/route.ts");
const offlineStore = read("src/lib/offline-pack.ts");
const offlineWarmup = read("src/components/OfflinePackWarmup.tsx");
const offlineShell = read("public/offline.html");
const css = read("src/app/globals.css");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.92.8"', "v81-or-newer package version missing");
must(packageJson, '"v81:check"', "v81 validator command missing");

for (const marker of ["closedTripReadOnlyResponse", "TRIP_CLOSED_READ_ONLY", "Trip is closed and read-only"]) {
  must(close, marker, `closed-Trip write barrier missing: ${marker}`);
}
for (const marker of [planner, budget]) {
  must(marker, 'financialStatus === "CLOSED"', "closed-Trip UI read-only state missing");
}

must(offlineApi, 'parameters.get("all") === "1"', "all-Trip offline endpoint missing");
must(offlineStore, "writeOfflinePacks", "atomic multi-Trip offline storage missing");
must(offlineWarmup, 'offline-pack?all=1', "automatic all-Trip offline warmup missing");
for (const marker of ["repeat(2,minmax(0,1fr))", "@media(max-width:640px)", "OPEN TRIPS"]) {
  must(offlineShell, marker, `standalone offline mobile containment missing: ${marker}`);
}
for (const marker of ["v81 — closed-Trip states", 'input[type="date"]', "grid-template-columns: minmax(0, 1fr) !important"]) {
  must(css, marker, `v81 mobile containment missing: ${marker}`);
}
must(worker, 'miles-meals-static-v92-8', "v81-or-newer service-worker cache bump missing");

console.log("v81 closed-Trip, all-Trip offline and mobile validation passed.");
