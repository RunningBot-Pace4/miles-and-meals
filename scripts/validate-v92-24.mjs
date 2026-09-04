import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const navigation = read("src/components/FullPageLink.tsx");
const navigationGate = read("scripts/validate-navigation.mjs");
const appLoading = read("src/app/(app)/loading.tsx");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const css = read("src/app/v92-living-journey.css");
const resetSql = read("neon-reset-all-data-keep-logins-v92-24.sql");
const schema = read("src/db/schema.ts");

must(packageJson, '"version": "1.92.24"', "V92.24 package version missing");
must(packageJson, '"v92-24:check"', "V92.24 release gate missing");
must(packageJson, "npm run v92-24:check", "V92.24 gate is not in prebuild");
must(worker, "miles-meals-static-v92-24", "V92.24 PWA cache missing");

for (const marker of [
  'from "next/link"',
  "<NextLink",
  'data-navigation-mode="client"',
  "prefetch = null",
  'data-prefetch-intent={prefetch === false ? "off" : "adaptive"}',
]) {
  must(navigation, marker, `Fast client navigation missing: ${marker}`);
}

for (const forbidden of [
  'data-navigation-mode="document"',
  "createPortal(<BrandedLoadingScreen />",
  "NAVIGATION_INDICATOR_TIMEOUT_MS",
  "NATIVE_NAVIGATION_FALLBACK_MS",
  "window.location.assign(targetUrl.href)",
]) {
  if (navigation.includes(forbidden)) {
    throw new Error(`V92.24 contains a second or full-document navigation path: ${forbidden}`);
  }
}

must(navigationGate, "sharedLinkPath", "Next Link is not isolated to the shared wrapper");
must(appLoading, "BrandedLoadingScreen", "Single rotating Halo boundary missing");
if (existsSync("src/app/loading.tsx")) {
  throw new Error("Duplicate root loading boundary returned");
}

for (const marker of [
  'className="journey-greeting-route-art"',
  'className="journey-greeting-status"',
  'className="journey-greeting-footer"',
  'className="journey-greeting-details"',
  "Travel dates",
  "Journey collection",
  "Destination",
]) {
  must(dashboard, marker, `Enhanced Home header rendering missing: ${marker}`);
}

for (const marker of [
  ".journey-greeting-route-art",
  ".journey-greeting-status",
  ".journey-greeting-footer",
  ".journey-greeting-details",
  ".journey-greeting-detail",
  "grid-template-columns: repeat(2, minmax(0, 1fr))",
  "@media (max-width: 719px)",
  "@media (max-width: 360px)",
]) {
  must(css, marker, `Enhanced Home header styling missing: ${marker}`);
}

for (const marker of [
  "BEGIN;",
  "LOCK TABLE",
  "IN SHARE MODE;",
  "_mnm_login_counts",
  "TRUNCATE TABLE",
  "RESTART IDENTITY;",
  "Reset verification failed",
  "COMMIT;",
]) {
  must(resetSql, marker, `Safe Neon reset marker missing: ${marker}`);
}

const truncateSource = resetSql
  .slice(resetSql.indexOf("TRUNCATE TABLE") + "TRUNCATE TABLE".length)
  .split("RESTART IDENTITY;")[0]
  .replace(/^\s*--.*$/gm, "");
const resetTables = new Set(
  truncateSource
    .split(",")
    .map((value) => value.trim().replaceAll('"', ""))
    .filter(Boolean),
);
const preservedTables = new Set([
  "user",
  "account",
  "session",
  "verification",
  "user_preferences",
]);
const schemaTables = [
  ...schema.matchAll(/pgTable\(\s*"([^"]+)"/g),
].map((match) => match[1]);

for (const table of preservedTables) {
  if (resetTables.has(table)) {
    throw new Error(`Neon reset incorrectly deletes preserved login table: ${table}`);
  }
}

const missingTables = schemaTables.filter(
  (table) => !preservedTables.has(table) && !resetTables.has(table),
);
if (missingTables.length > 0) {
  throw new Error(`Neon reset omits application tables: ${missingTables.join(", ")}`);
}

if (truncateSource.includes("CASCADE")) {
  throw new Error("Neon reset must fail safely on unknown dependencies instead of using CASCADE");
}

console.log("V92.24 fast navigation, enhanced Home header and safe Neon login-preserving reset gate passed.");
