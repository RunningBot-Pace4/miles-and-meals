import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const css = read("src/app/v92-living-journey.css");
const components = [
  read("src/components/LivingJourneyStarter.tsx"),
  read("src/components/LivingJourneyHalo.tsx"),
];

must(packageJson, '"version": "1.92.26"', "V92.7 package version missing");
must(packageJson, '"v92-7:check"', "V92.7 validation script missing");
must(packageJson, "npm run v92-7:check", "V92.7 validation is not in the build gate");
must(worker, "miles-meals-static-v92-26", "V92.7 service-worker cache missing");

for (const component of components) {
  must(component, 'className="journey-mode-switcher"', "Halo tabs do not have an independent switcher");
  must(component, 'role="tablist"', "Independent Halo switcher is missing tablist semantics");
  if (component.includes('activeMode === mode ? " active"')) {
    throw new Error("Legacy active class is still coupled to Halo tab layout");
  }
}

[
  "/* V92.7 · structurally isolated Halo controls",
  '"core"',
  '"modes" !important;',
  ".journey-mode-switcher {",
  "grid-template-columns: repeat(4, minmax(0, 1fr));",
  ".journey-mode-switcher > .journey-mode,",
  "grid-area: auto !important;",
  "position: static !important;",
  "inset: auto !important;",
  "height: 40px !important;",
  "transform: none !important;",
].forEach((marker) => must(css, marker, `V92.7 structural marker missing: ${marker}`));

console.log("V92.7 isolated Halo and invariant four-tab geometry validation passed.");
