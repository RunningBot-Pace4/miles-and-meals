import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const navigation = read("src/components/FullPageLink.tsx");
const cleanup = read("scripts/cleanup-legacy-files.mjs");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.92.27"', "V92.27 package version missing");
must(packageJson, '"v92-27:check"', "V92.27 release gate missing");
must(packageJson, "npm run v92-27:check", "V92.27 gate is not in prebuild");
must(worker, "miles-meals-static-v92-27", "V92.27 PWA cache missing");
must(navigation, "isInstalledPwa", "Installed-PWA navigation detection missing");
must(navigation, 'data-pwa-navigation-mode="document"', "PWA document navigation marker missing");
must(navigation, "event.preventDefault()", "Competing PWA client transition is not stopped");
must(navigation, "window.location.href = targetUrl.href", "Immediate PWA document navigation missing");
must(navigation, 'data-navigation-mode="client"', "Fast web client navigation missing");

for (const marker of [
  "setTimeout",
  "NATIVE_NAVIGATION_FALLBACK_MS",
  "window.location.replace(window.location.href)",
]) {
  if (navigation.includes(marker)) {
    throw new Error(`Delayed second navigation returned: ${marker}`);
  }
}

for (const path of [
  "src/lib/src",
  "src/lib/tests",
  "src/lib/scripts",
  "src/lib/public",
  "src/lib/e2e",
  "src/lib/package.json",
  "src/lib/next.config.ts",
]) {
  must(cleanup, `"${path}"`, `Nested-project cleanup missing: ${path}`);
  if (existsSync(path)) throw new Error(`Nested-project artifact remains: ${path}`);
}

console.log("V92.27 reliable installed-PWA navigation and complete nested-project cleanup gate passed.");
