import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const css = read("src/app/v92-living-journey.css");
const picker = read("src/components/DateRangePicker.tsx");
const e2e = read("e2e/v92-9-responsive-components.spec.ts");
const fullPwaE2e = read("e2e/v92-9-full-pwa-audit.spec.ts");

must(packageJson, '"version": "1.92.11"', "V92.9 package version missing");
must(packageJson, '"v92-9:check"', "V92.9 validation script missing");
must(packageJson, "npm run v92-9:check", "V92.9 validation is not in the build gate");
must(worker, "miles-meals-static-v92-11", "V92.9 service-worker cache missing");

[
  'className="date-range-instruction"',
  'className="text-button date-range-done"',
  'isToday ? "today"',
].forEach((marker) => must(picker, marker, `Calendar interaction marker missing: ${marker}`));

[
  "/* V92.9 · calendar system and complete PWA alignment",
  'input[type="datetime-local"]',
  "height: 46px !important",
  ".settlement-partial-amount > span:first-child",
  "grid-template-areas: none !important",
  "grid-column: 1 / -1 !important",
  "@media (max-width: 430px)",
  "@media (max-width: 360px)",
].forEach((marker) => must(css, marker, `V92.9 responsive marker missing: ${marker}`));

for (const width of [320, 360, 390, 430]) {
  must(e2e, String(width), `V92.9 ${width}px component audit missing`);
  must(fullPwaE2e, String(width), `V92.9 ${width}px full-PWA audit missing`);
}
for (const route of ["/dashboard", "/planner", "/expenses", "/settlements", "/offline", "/more"]) {
  must(fullPwaE2e, `"${route}"`, `V92.9 full-PWA route missing: ${route}`);
}
must(fullPwaE2e, "narrowTextControls", "V92.9 full-PWA audit does not detect collapsed text controls");

console.log("V92.9 calendar system and full-width mobile settlement validation passed.");
