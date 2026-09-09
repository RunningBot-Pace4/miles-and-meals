import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const layout = read("src/app/layout.tsx");
const css = read("src/app/v92-living-journey.css");
const geometry = read("e2e/v92-17-viewport-keyboard.spec.ts");

must(packageJson, '"version": "1.92.21"', "V92.17 package version missing");
must(packageJson, '"v92-17:check"', "V92.17 validation script missing");
must(packageJson, "npm run v92-17:check", "V92.17 gate is not in prebuild");
must(worker, "miles-meals-static-v92-21", "V92.17 service-worker cache missing");

for (const marker of ['width: "device-width"', "initialScale: 1", 'viewportFit: "cover"']) {
  must(layout, marker, `Accessible device viewport missing: ${marker}`);
}
for (const retired of ["maximumScale: 1", "userScalable: false"]) {
  if (layout.includes(retired)) {
    throw new Error(`V96 accessibility regression: ${retired}`);
  }
}
for (const marker of [
  "/* V92.17 · stable phone viewport",
  "-webkit-text-size-adjust: 100%",
  "font-size: 16px !important",
  ".expense-editor:has(input:focus, select:focus, textarea:focus) .sticky-save",
  "position: static !important",
]) must(css, marker, `Keyboard-safe phone CSS missing: ${marker}`);

for (const marker of ["320, 360, 390, 430, 600, 719", "inputFontSize", "savePosition"]) {
  must(geometry, marker, `Viewport geometry coverage missing: ${marker}`);
}

console.log("V92.17 keyboard-safe viewport compatibility gate passed.");
