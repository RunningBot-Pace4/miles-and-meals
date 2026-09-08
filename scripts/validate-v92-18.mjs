import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const form = read("src/components/ExpenseForm.tsx");
const css = read("src/app/v92-living-journey.css");
const geometry = read("e2e/v92-18-expense-pwa-layout.spec.ts");
const rules = css.slice(css.indexOf("/* V92.18 · fixed expense canvas"));

must(packageJson, '"version": "1.92.21"', "V92.18 package version missing");
must(packageJson, '"v92-18:check"', "V92.18 validation script missing");
must(packageJson, "npm run v92-18:check", "V92.18 gate is not in prebuild");
must(worker, "miles-meals-static-v92-21", "V92.18 service-worker cache missing");

for (const marker of [
  '<p className="eyebrow">EXPENSE</p>',
  '<svg viewBox="0 0 24 24"',
  "Take a photo or choose one",
]) must(form, marker, `Receipt header correction missing: ${marker}`);

for (const marker of [
  "/* V92.18 · fixed expense canvas",
  "html:has(.expense-editor)",
  "overscroll-behavior-x: none",
  "grid-template-columns: repeat(4, minmax(0, 1fr)) !important",
  ".expense-editor .sticky-save",
  "position: static !important",
  "touch-action: pan-y",
]) must(rules, marker, `Expense PWA layout rule missing: ${marker}`);

for (const marker of [
  "320, 360, 390, 430, 600, 719",
  "window.scrollTo(120, 0)",
  "scrollX",
  "savePosition",
]) must(geometry, marker, `Expense geometry coverage missing: ${marker}`);

console.log("V92.18 expense PWA layout gate passed.");
