import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

const packageJson = read("package.json");
const newExpense = read("src/app/(app)/expenses/new/page.tsx");
const expenseForm = read("src/components/ExpenseForm.tsx");
const invites = read("src/lib/trip-invites.ts");
const inviteValidity = read("src/lib/invite-validity.ts");
const invitePanel = read("src/components/TripInvitePanel.tsx");
const journeys = read("src/lib/journeys.ts");
const journeyManager = read("src/components/JourneyManager.tsx");
const journeyPage = read("src/app/(app)/journeys/[id]/page.tsx");
const offlinePack = read("src/lib/offline-pack.ts");
const offlineWorkspace = read("src/components/OfflinePackWorkspace.tsx");
const offlineApi = read("src/app/api/offline-pack/route.ts");
const offlineShell = read("public/offline.html");
const offlineQueue = read("src/lib/offline-queue.ts");
const sync = read("src/components/OfflineQueueSync.tsx");
const css = read("src/app/globals.css");
const worker = read("public/sw.js");
const updater = read("src/components/PwaRegister.tsx");

must(packageJson, '"version": "1.92.15"', "v80-or-newer package version missing");
must(packageJson, '"v80:check"', "v80 validator command missing");
must(newExpense, 'financialStatus !== "CLOSED"', "closed Trips are not removed from Add Expense");
if (expenseForm.includes("financially locked trip")) throw new Error("retired locked Trip wording is still visible");
must(expenseForm, "tripName} · ${country.name", "expense selector must identify Trip and country");

for (const marker of ["TRIP_INVITE_VALIDITY_HOURS = 12", "43_200_000"]) {
  must(inviteValidity, marker, `12-hour invite helper missing: ${marker}`);
}
must(invites, "earliestValidTripInviteCreatedAt", "existing invites are not capped at 12 hours");
must(invitePanel, "valid for 12 hours", "invite/QR 12-hour wording missing");
must(invitePanel, "expiresAt", "invite expiry time is not shown");

must(journeys, "getJourneyForUser", "Journey result query missing");
must(journeyManager, "View Journey", "Journey result link missing");
for (const marker of ["journey-overview", "JourneyTripOpenButton", "Expenses locked", "Base {trip.baseCurrency}"]) {
  must(journeyPage, marker, `Journey overview missing: ${marker}`);
}

for (const marker of ["OFFLINE_PACKS_STORAGE_KEY", "readOfflinePacks", "OFFLINE_SELECTED_TRIP_STORAGE_KEY"]) {
  must(offlinePack, marker, `multi-Trip offline storage missing: ${marker}`);
}
for (const marker of ["trips: OfflineTripOption[]", "Save selected Trip", "Currency", "countryId: pack.trip.countryId", "forceRetry: true"]) {
  must(offlineWorkspace, marker, `multi-Trip offline workspace missing: ${marker}`);
}
must(offlineApi, 'parameters.get("tripId")', "offline API is not Trip-selectable");
must(offlineShell, 'mnm:offline-packs:v3', "standalone offline shell lacks multi-Trip packs");
must(offlineShell, 'id="currency"', "standalone offline currency selector missing");
must(offlineQueue, "forceRetry?: boolean", "reconnect retry bypass missing");
must(sync, "sync(true)", "online event does not force immediate retry");

for (const marker of ["v80 — calendar containment", "position: relative !important", ".journey-route-card", ".offline-trip-picker"]) {
  must(css, marker, `v80 responsive CSS missing: ${marker}`);
}
must(worker, 'miles-meals-static-v92-15', "v80-or-newer service-worker cache bump missing");
must(worker, 'type === "SKIP_WAITING"', "v80 worker cannot be activated by the controlled update flow");
must(updater, 'type: "SKIP_WAITING"', "v80-or-newer updater does not activate the waiting worker");

console.log("v80 locked Trip, invite, Journey, offline and calendar validation passed.");
