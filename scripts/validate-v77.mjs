import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function must(text, needle, message) { if (!text.includes(needle)) throw new Error(message); }

const schema = read("src/db/schema.ts");
const invite = read("src/lib/trip-invites.ts");
const inviteUi = read("src/components/TripInvitePanel.tsx");
const journeys = read("src/lib/journeys.ts");
const itemization = read("src/lib/receipt-itemization.ts");
const expenseForm = read("src/components/ExpenseForm.tsx");
const inbox = read("src/components/TripInboxClient.tsx");
const offline = read("src/components/OfflinePackWorkspace.tsx");
const offlineShell = read("public/offline.html");
const settlement = read("src/components/LiveSettlementWorkspace.tsx");
const profile = read("src/components/ProfileSettingsForm.tsx");
const backup = read("src/app/api/admin/backup/route.ts");
const reset = read("scripts/reset-app-data-keep-users.ts");
const manifest = read("public/manifest.webmanifest");
const more = read("src/app/(app)/more/page.tsx");
const packageJson = read("package.json");
const navigationSafety = read("src/lib/navigation-safety.ts");
const privateDeviceData = read("src/lib/private-device-data.ts");
const signOutButton = read("src/components/SignOutButton.tsx");
const inviteRoute = read("src/app/api/trips/[id]/invite/route.ts");
const inboxRoute = read("src/app/api/trip-inbox/route.ts");
const addInboxToPlan = read("src/app/api/trip-inbox/[id]/add-to-plan/route.ts");
const journeyUi = read("src/components/JourneyManager.tsx");
const editExpensePage = read("src/app/(app)/expenses/[id]/edit/page.tsx");
const v77Tests = read("tests/v77-features.test.ts");

for (const marker of ["journeys", "tripInvites", "expenseItems", "expenseItemAssignments", "tripInboxItems", 'locale: text("locale")', 'timeZone: text("time_zone")']) {
  must(schema, marker, `v77 schema missing ${marker}`);
}
must(invite, "randomBytes(24)", "v71 secure invite token generation missing");
must(inviteUi, 'import("qrcode")', "v71 private local QR generation missing");
must(inviteUi, "navigator.share", "v71 share-sheet invitation missing");
must(journeys, "updateJourneyTrips", "v72 Journey trip grouping missing");
must(itemization, "Tax / service / remaining", "v73 proportional receipt overhead allocation missing");
must(expenseForm, "Apply itemized split", "v73 receipt item assignment UI missing");
must(inbox, "Save to Trip Inbox", "v74 Trip Inbox review flow missing");
must(inbox, "Add to Plan", "v74 Trip Inbox to Planner bridge missing");
must(offline, "Save offline expense", "v75 offline quick expense missing");
must(offlineShell, "mnm:offline-pack:v2", "v75 true offline shell pack missing");
must(offlineShell, "mnm:offline-mutation-queue:v1", "v75 offline shell safe sync queue missing");
must(settlement, "SettlementPaymentTools", "v76 Smart Settlement payment UX missing");
must(profile, "Regional number format", "v77 locale preference UI missing");
must(profile, "Time zone", "v77 time-zone preference UI missing");
must(manifest, '"Trip Inbox"', "v77 PWA Trip Inbox shortcut missing");
for (const href of ['/journeys', '/inbox', '/offline']) must(more, `href="${href}"`, `v77 More menu missing ${href}`);
for (const marker of ["journeyRows", "expenseItemRows", "expenseItemAssignmentRows", "inboxRows"]) must(backup, marker, `v77 backup missing ${marker}`);
for (const table of ["expense_item_assignments", "expense_items", "trip_inbox_items", "trip_invites", "journeys"]) must(reset, table, `v77 keep-login reset missing ${table}`);
const packageVersion = JSON.parse(packageJson).version ?? "0.0.0";
const [major, minor] = packageVersion.split(".").map(Number);
if (major < 1 || (major === 1 && minor < 77)) {
  throw new Error("v77 package version missing");
}
must(packageJson, '"v77:check"', "v77 validator script missing");

must(navigationSafety, "safeInternalPath", "v77 auth return-path sanitizer missing");
must(privateDeviceData, "clearPrivateDeviceData", "v77 signed-out private-device cleanup missing");
must(signOutButton, "clearPrivateDeviceData", "v77 sign-out private-device cleanup is not wired");
must(inviteRoute, "export async function DELETE", "v71 invite revoke endpoint missing");
must(inviteUi, "Revoke links", "v71 invite revoke UI missing");
must(inboxRoute, "rawText: null", "v74 Trip Inbox must not persist raw imported booking text");
must(addInboxToPlan, "Imported from Trip Inbox", "v74 planner bridge must not copy raw booking bodies");
must(addInboxToPlan, "id: item.id", "v74 Inbox to Plan must use a stable idempotency key");
must(addInboxToPlan, ".onConflictDoNothing()", "v74 Inbox to Plan retry/double-tap protection missing");
must(inbox, "extractPdfTextBestEffort", "v74 best-effort PDF text extraction missing");
must(journeyUi, "SHARED JOURNEY", "v72 read-only shared Journey state missing");
must(editExpensePage, "itemization,", "v73 existing receipt itemization must survive edit flow");
must(itemization, "Receipt item rows could not reconcile", "v73 exact itemization reconciliation guard missing");
for (const marker of ["safeInternalPath", "extractPdfTextBestEffort", "awkward FX rounding", "greater than the expense total"]) {
  must(v77Tests, marker, `v77 regression tests missing ${marker}`);
}

console.log("v71–v77 global web/PWA enhancement pack validation passed.");
