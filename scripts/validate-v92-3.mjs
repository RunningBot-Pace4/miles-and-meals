import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const links = read("src/components/FullPageLink.tsx");
const navigationGate = read("scripts/validate-navigation.mjs");
const css = read("src/app/v92-living-journey.css");
const login = read("src/components/LoginForm.tsx");

must(packageJson, '"version": "1.92.23"', "V92.3-or-newer package version missing");
must(packageJson, '"node": "24.x"', "V92.3 must match the Vercel Node.js 24 setting");
must(packageJson, '"v92-3:check"', "V92.3 release gate missing");
must(packageJson, "npm run v92-3:check", "V92.3 gate is not part of prebuild");
must(worker, "miles-meals-static-v92-23", "V92.3-or-newer service-worker cache missing");

for (const marker of [
  'data-full-page-link="true"',
  'data-navigation-mode="document"',
  "data-navigation-pending",
  "onPointerDown={handlePointerDown}",
  "createPortal(<BrandedLoadingScreen />",
]) must(links, marker, `V92.3 reliable navigation feedback missing: ${marker}`);

if (links.includes('from "next/link"') || links.includes("NATIVE_NAVIGATION_FALLBACK_MS")) {
  throw new Error("V92.3-or-newer still contains the superseded dual navigation path");
}
if (navigationGate.includes('relativePath === "src/components/FullPageLink.tsx"')) {
  throw new Error("V92.3-or-newer still exempts FullPageLink from the navigation gate");
}

for (const marker of [
  'button[role="tab"][aria-selected="true"]',
  'border-color: var(--v92-blue) !important',
  'background: white !important',
  'content: none !important',
  '.menu-row.link-row[data-navigation-pending="true"]',
  'box-shadow: inset 0 0 0 2px var(--v92-blue) !important',
]) must(css, marker, `V92.3 blue-only selection treatment missing: ${marker}`);

if (login.includes('from "@/components/SavingOverlay"') || login.includes("<SavingOverlay")) {
  throw new Error("V92.3 login still renders the first of the duplicate loading screens");
}
must(login, 'aria-busy={busy}', "V92.3 login busy state is not accessible");
must(login, 'busy ? "Signing in…"', "V92.3 login no longer gives inline progress feedback");

console.log("V92.3 blue selection, resilient PWA navigation, Node 24 and single login loader validation passed.");
