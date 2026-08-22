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

const appLayout = read("src/app/(app)/layout.tsx");
const back = read("src/components/MobileContextBack.tsx");
const wrapped = read("src/app/(app)/wrapped/page.tsx");
const wrappedPicker = read("src/components/WrappedTripSelect.tsx");
const search = read("src/app/(app)/search/page.tsx");
const mobileNav = read("src/components/MobileNav.tsx");
const css = read("src/app/globals.css");
const resetSql = read("scripts/neon-reset-keep-login.sql");
const resetTs = read("scripts/reset-app-data-keep-users.ts");
const mobileE2e = read("e2e/mobile-v69-complete-flow.spec.ts");
const packageJson = read("package.json");

// Context-aware back navigation only on secondary screens.
must(appLayout, "<MobileContextBack />", "v69 mobile back control is not mounted in the app shell");
must(back, '"/dashboard"', "v69 primary-route back exclusion missing");
must(back, '"/expenses/new"', "v69 Add tab should not show a redundant back button");
must(back, 'aria-label="Go back"', "v69 accessible back button missing");
must(back, "mm:app-route-stack", "v69 safe in-app route-stack tracking missing");

// Trip Wrapped must navigate instantly on trip selection.
must(wrapped, "WrappedTripSelect", "v69 Trip Wrapped auto selector missing");
must(wrappedPicker, "void changeTrip(event.target.value)", "v69 Trip Wrapped does not switch on selection");
must(wrappedPicker, "activateTrip(nextTripId)", "v69 Trip Wrapped should sync active trip before opening it");
mustNot(wrapped, '>View</button>', "v69 Trip Wrapped still requires the extra View button");

// Search must retain mobile tools and not summon the keyboard immediately.
must(mobileNav, 'data-app-mobile-nav="true"', "v69 mobile navigation marker missing");
mustNot(search, "autoFocus", "v69 Search should not auto-focus and cover the bottom tools on mobile");
must(search, 'enterKeyHint="search"', "v69 Search mobile keyboard hint missing");
must(css, ".mobile-nav {\n    z-index: 120", "v69 mobile navigation stacking hardening missing");

// Mobile design system / viewport coverage.
must(css, ".mobile-context-back", "v69 mobile back styling missing");
must(css, "font-size: 16px", "v69 iOS form zoom prevention missing");
must(css, "min-height: 50px", "v69 premium mobile form sizing missing");
must(mobileE2e, "320px compact phone", "v69 320px mobile coverage missing");
must(mobileE2e, "430px large phone", "v69 large-phone coverage missing");
must(mobileE2e, "expectBottomNavUsable", "v69 bottom-tool E2E coverage missing");
must(mobileE2e, "expectNoOverflow", "v69 horizontal-overflow E2E coverage missing");

// Neon reset must preserve auth/login tables while removing app data.
must(resetSql, '"user"', "v69 reset documentation must explicitly preserve user login table");
must(resetSql, '"account"', "v69 reset documentation must preserve account credentials");
must(resetSql, '"session"', "v69 reset documentation must preserve current sessions");
must(resetSql, "TRUNCATE TABLE", "v69 Neon reset SQL missing");
must(resetSql, "trips,", "v69 Neon reset SQL does not clear trips");
must(resetSql, "expenses,", "v69 Neon reset SQL does not clear expenses");
mustNot(resetSql, 'TRUNCATE TABLE\n  "user"', "v69 reset SQL must never truncate user login records");
must(resetTs, 'RESET_APP_DATA !== "YES"', "v69 destructive reset opt-in guard missing");
must(packageJson, '"db:reset:keep-login"', "v69 safe reset npm command missing");
must(packageJson, '"v69:check"', "v69 package validation command missing");

console.log("v69 mobile flow, instant Trip Wrapped, navigation and safe Neon reset validation passed.");
