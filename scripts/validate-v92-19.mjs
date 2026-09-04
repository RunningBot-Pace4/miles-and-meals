import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const form = read("src/components/ExpenseForm.tsx");
const navigation = read("src/components/FullPageLink.tsx");
const mobileNav = read("src/components/MobileNav.tsx");
const navigationGate = read("scripts/validate-navigation.mjs");
const css = read("src/app/v92-living-journey.css");
const livingJourneyCss = read("src/app/living-journey.css");
const geometry = read("e2e/v92-19-payer-layout.spec.ts");

must(packageJson, '"version": "1.92.20"', "V92.19 package version missing");
must(packageJson, '"v92-19:check"', "V92.19 release gate missing");
must(packageJson, "npm run v92-19:check", "V92.19 gate is not in prebuild");
must(worker, "miles-meals-static-v92-20", "V92.19 service-worker cache missing");

for (const marker of [
  'className="single-payer-list"',
  'className={selected ? "payer-choice-row selected" : "payer-choice-row"}',
  'role="radiogroup"',
  'className="payer-amount-input"',
  "splitPresetsRequested",
  "if (event.currentTarget.open) setSplitPresetsRequested(true)",
]) must(form, marker, `V92.19 payer or lazy-data correction missing: ${marker}`);

const payerRules = css.slice(css.indexOf("/* V92.19 · unified payer rows"));
for (const marker of [
  ".single-payer-list",
  ".payer-choice-row.selected",
  "grid-template-columns: repeat(2, minmax(0, 1fr)) !important",
  "grid-template-columns: repeat(4, minmax(0, 1fr)) !important",
  ".payer-amount-input > span",
  "grid-template-columns: auto minmax(0, 1fr) !important",
  "@media (max-width: 360px)",
]) must(payerRules, marker, `V92.19 responsive payer styling missing: ${marker}`);

for (const marker of [
  'from "next/link"',
  "prefetch = false",
  "NATIVE_NAVIGATION_FALLBACK_MS",
  "window.location.assign(targetUrl.href)",
]) must(navigation, marker, `V92.19 resilient navigation missing: ${marker}`);
must(mobileNav, "prefetch", "V92.19 main-navigation prefetch missing");
must(
  navigationGate,
  'relativePath === "src/components/FullPageLink.tsx"',
  "V92.19 Next Link exception must be scoped to FullPageLink",
);

must(
  livingJourneyCss,
  "shared v91 base rules live in globals.css",
  "V92.19 CSS deduplication note missing",
);
if (Buffer.byteLength(livingJourneyCss, "utf8") >= 8_000) {
  throw new Error("V92.19 still ships the duplicated Living Journey base stylesheet");
}

for (const marker of [
  "320, 360, 390, 430, 600, 719",
  "single payer rows stay compact",
  "four split modes stay on one line",
  "selected multiple-payer amount stays usable",
]) must(geometry, marker, `V92.19 payer geometry coverage missing: ${marker}`);

console.log("V92.19 payer design, lazy expense data, resilient navigation and CSS performance gate passed.");
