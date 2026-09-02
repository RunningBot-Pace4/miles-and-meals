import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const starter = read("src/components/LivingJourneyStarter.tsx");
const halo = read("src/components/LivingJourneyHalo.tsx");
const css = read("src/app/v92-living-journey.css");

must(packageJson, '"version": "1.92.11"', "V92.5 package version missing");
must(packageJson, '"v92-5:check"', "V92.5 release gate missing");
must(packageJson, "npm run v92-5:check", "V92.5 gate is not part of prebuild");
must(worker, "miles-meals-static-v92-11", "V92.5 service-worker cache missing");

for (const source of [starter, halo]) {
  for (const marker of [
    'className="journey-panel-stack"',
    "aria-hidden={!selected}",
    'selected ? " is-active" : ""',
    "aria-controls={`living-journey",
    "aria-labelledby={`living-journey",
  ]) must(source, marker, `Stable four-mode panel structure missing: ${marker}`);

  if (source.includes("key={activeMode}")) {
    throw new Error("V92.5 must not replace the shared panel and reflow the page on every mode change");
  }
}

for (const marker of [
  ".journey-panel-stack {",
  "display: grid",
  "grid-area: 1 / 1",
  "visibility: hidden",
  "pointer-events: none",
  ".journey-panel-stack > .journey-live-panel.is-active",
  "visibility: visible",
  "pointer-events: auto",
]) must(css, marker, `Equal-height panel stack styling missing: ${marker}`);

if (css.includes("@keyframes v92-mode-panel-in")) {
  throw new Error("V92.5 still moves the panel vertically during mode changes");
}

console.log("V92.5 fixed-height Living Journey panel stack and no-reflow mode switching validation passed.");
