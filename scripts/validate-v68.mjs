import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

function mustNot(text, needle, message) {
  if (text.includes(needle)) throw new Error(message);
}

const settlementPage = read("src/app/(app)/settlements/page.tsx");
const settlementPicker = read("src/components/SettlementTripSelect.tsx");
const settlementSummary = read("src/app/api/settlements/summary/route.ts");
const settlementAction = read("src/app/api/settlements/route.ts");
const financialPanel = read("src/components/FinancialClosePanel.tsx");
const ledger = read("src/lib/settlement-ledger.ts");
const workspace = read("src/components/LiveSettlementWorkspace.tsx");
const locationPage = read("src/app/(app)/location/page.tsx");
const locationTracker = read("src/components/LocationTracker.tsx");
const locationRead = read("src/app/api/locations/route.ts");
const locationWrite = read("src/app/api/location/route.ts");
const packageJson = read("package.json");

// Settle Up must be trip-first, not country/destination-first.
must(settlementPage, "SettlementTripSelect", "v68 settlement trip selector missing");
must(settlementPicker, "{trip.name} · {trip.statusLabel}", "v68 settlement dropdown must show trip name + readiness");
must(settlementPicker, "activateTrip", "v68 settlement trip picker must keep active-trip context in sync");
must(settlementPage, 'label: "Ready to lock"', "v68 ready-to-lock status missing");
must(settlementPage, 'className="settlement-trip-context"', "v68 selected-trip context card missing");
mustNot(settlementPage, "All destinations", "v68 must remove All destinations from Settle Up");
mustNot(settlementPage, "Trip / country", "v68 must remove Trip / country label");
must(financialPanel, "FINANCIAL CHECKPOINT · {state.tripName}", "v68 financial checkpoint must name the trip");

// Settle Up may safely read/action any trip the signed-in traveler can access.
must(settlementSummary, "activeTrip.allCountries", "v68 settlement summary must support accessible non-active trips");
must(settlementSummary, "activeTrip.trips.some", "v68 settlement trip access validation missing");
must(settlementAction, "canAccessCountry", "v68 settlement actions must use accessible-country authorization");

// Settlement rows should identify the trip, not only the country.
must(ledger, "tripName: string;", "v68 settlement ledger tripName missing");
must(ledger, "tripName: trips.name", "v68 settlement ledger does not load trip name");
must(workspace, "transfer.tripName", "v68 Smart Settlement still displays country instead of trip");
must(workspace, "payment.tripName", "v68 settlement history still displays country instead of trip");

// Live GPS trip selector should also use trip names.
must(locationPage, "activeTrip.allCountries.filter", "v68 location page should expose accessible trips");
must(locationTracker, ">\n            Trip\n            <select", "v68 location selector label must be Trip");
must(locationTracker, "{country.tripName}", "v68 location selector must display trip name");
must(locationTracker, "Destination:", "v68 location selector should retain destination context outside dropdown");
must(locationRead, "canAccessCountry", "v68 location read access should support selected accessible trip");
must(locationWrite, "canAccessCountry", "v68 location write access should support selected accessible trip");

must(packageJson, '"v68:check"', "v68 package validation script missing");

console.log("v68 trip-first dropdown and settlement-context validation passed.");
