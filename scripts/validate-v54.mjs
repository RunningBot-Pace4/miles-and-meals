import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const fail = (message) => failures.push(message);

const settlementWorkspace = read("src/components/LiveSettlementWorkspace.tsx");
const settlementApi = read("src/app/api/settlements/route.ts");
const tripsPage = read("src/app/(app)/trips/page.tsx");
const tripManager = read("src/components/TripManager.tsx");
const tripManagement = read("src/lib/trip-management.ts");
const memberRoute = read("src/app/api/trips/[id]/countries/[countryId]/members/route.ts");
const access = read("src/lib/access.ts");

if (
  !settlementWorkspace.includes("Completed · View only") ||
  !settlementWorkspace.includes("Completed payments")
) {
  fail("Completed settlements must render as view-only history.");
}

if (
  settlementApi.includes("export async function PATCH") ||
  settlementApi.includes("export async function DELETE")
) {
  fail("Settlement API must not expose edit/delete mutation methods.");
}

if (
  !tripManager.includes("Assign travelers to this trip") ||
  !tripManager.includes("Trip Owner · Always assigned") ||
  !tripManager.includes("disabled={busy !== null || isOwner}")
) {
  fail("Trip Owner traveler assignment UI or owner protection is missing.");
}

if (
  !memberRoute.includes("canManageTrip") ||
  !memberRoute.includes("ensureTripMember") ||
  !memberRoute.includes("removeTripMemberIfNoCountryAccess") ||
  !memberRoute.includes("The Trip Owner cannot be removed from their own trip.")
) {
  fail("Trip Owner assignment API must allow owners and keep membership in sync.");
}

if (
  !access.includes("removeTripMemberIfNoCountryAccess") ||
  !access.includes("createdBy: trips.createdBy")
) {
  fail("Trip membership cleanup or Trip Owner protection is missing.");
}

if (
  !tripsPage.includes("listActiveUsersForTripManagement") ||
  !tripsPage.includes("managedTrips.length") ||
  !tripsPage.includes("isSystemAdmin(session.user.role)") ||
  !tripManagement.includes("if (includeEmail)") ||
  !tripManagement.includes("email: user.email")
) {
  fail("Admin-email / traveler-name privacy split is missing.");
}

// Non-admin branch must select names without user.email.
const noEmailBranch = tripManagement.split("if (includeEmail)")[1]?.split("export async function listJoinedTrips")[0] ?? "";
if (!noEmailBranch.includes("name: user.name") || !noEmailBranch.includes("return rows")) {
  fail("Trip Owner traveler directory must remain available by name.");
}

if (failures.length) {
  console.error("v54 validation failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("v54 settlement lock + trip traveler permissions validation passed.");
