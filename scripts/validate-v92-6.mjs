import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const css = read("src/app/v92-living-journey.css");

must(packageJson, '"version": "1.92.14"', "V92.6 package version missing");
must(packageJson, '"v92-6:check"', "V92.6 validation script missing");
must(packageJson, "npm run v92-6:check", "V92.6 validation is not in the build gate");
must(worker, "miles-meals-static-v92-14", "V92.6 service-worker cache missing");

[
  ".journey-mode-switcher {",
  "grid-template-columns: repeat(4, minmax(0, 1fr));",
  ".journey-mode-switcher > .journey-mode,",
  "width: 100% !important;",
  "min-width: 0 !important;",
  "contain: layout paint;",
  ".journey-mode-switcher > .journey-mode[aria-selected=\"true\"] {",
  "box-shadow: inset 0 0 0 1px var(--v92-blue) !important;",
].forEach((marker) => must(css, marker, `V92.6 tab-row marker missing: ${marker}`));

const stationaryBlock = css.slice(css.indexOf("/* V92.7 · structurally isolated Halo controls"));
if (!stationaryBlock.includes("transform: none !important;")) {
  throw new Error("V92.6 active tabs can still move");
}

console.log("V92.6 stationary equal-width Halo tab layout validation passed.");
