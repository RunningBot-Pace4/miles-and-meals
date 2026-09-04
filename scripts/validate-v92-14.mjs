import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const css = read("src/app/v92-living-journey.css");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const authenticatedAudit = read("e2e/v92-9-full-pwa-audit.spec.ts");
const geometry = read("e2e/v92-12-pwa-layout.spec.ts");
const publicAudit = read("e2e/public-pwa.spec.ts");

must(packageJson, '"version": "1.92.23"', "V92.14 package version missing");
must(packageJson, '"v92-14:check"', "V92.14 validation script missing");
must(packageJson, "npm run v92-14:check", "V92.14 validation is not in the build gate");
must(worker, "miles-meals-static-v92-23", "V92.14 PWA cache missing");

for (const marker of [
  "/* V92.14 · full Web/PWA responsive contract",
  ".dashboard-action-heading",
  ".dashboard-action-card",
  "grid-template-columns: 42px minmax(0, 1fr) !important",
  ".dashboard-action-copy strong",
  "white-space: normal",
  ".dashboard-action-arrow",
  ".page-container > .stack > *",
  ".notification-center-item-main",
  ".settlement-history-row",
  ".offline-document-row",
  ".admin-user-row",
  ".table-wrap, .table-scroll, .responsive-table",
]) {
  must(css, marker, `Responsive CSS contract missing: ${marker}`);
}

for (const marker of [
  "completed trip",
  "still accepts",
  "Lock the expense ledger once everyone has finished adding spending.",
  "Smart settlement ready ·",
]) {
  must(dashboard, marker, `Compact dashboard attention copy missing: ${marker}`);
}

for (const marker of [
  "actionHeadingSameRow",
  "actionCopyHasRoom",
  "actionArrowInsideCard",
  "actionTextFits",
]) {
  must(geometry, marker, `Attention-card geometry assertion missing: ${marker}`);
}

for (const marker of [
  "responsiveRows",
  "clippedActionCopy",
  "final content hidden by bottom navigation",
]) {
  must(authenticatedAudit, marker, `Full authenticated audit missing: ${marker}`);
}

for (const marker of [
  '"/login"',
  '"/register"',
  '"/forgot-password"',
  '"/offline.html"',
  "320, 360, 390, 430, 600, 768, 820, 1024",
]) {
  must(publicAudit, marker, `Public PWA audit missing: ${marker}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const appPages = walk("src/app/(app)")
  .filter((file) => file.endsWith(`${path.sep}page.tsx`))
  .map((file) => {
    const relative = path.relative("src/app/(app)", file).replaceAll(path.sep, "/");
    return `/${relative.replace(/\/page\.tsx$/, "")}`;
  });

for (const route of appPages.filter((route) => !route.includes("["))) {
  must(authenticatedAudit, `"${route}"`, `Authenticated Web/PWA audit is missing ${route}`);
}

console.log(`V92.14 full responsive contract passed across ${appPages.length} authenticated page routes.`);
