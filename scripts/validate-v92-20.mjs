import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const loading = read("src/components/BrandedLoadingScreen.tsx");
const launch = read("src/app/layout.tsx");
const dismiss = read("src/components/PwaLaunchDismiss.tsx");
const saving = read("src/components/SavingOverlay.tsx");
const css = read("src/app/v92-living-journey.css");

must(packageJson, '"version": "1.92.20"', "V92.20 package version missing");
must(packageJson, '"v92-20:check"', "V92.20 release gate missing");
must(packageJson, "npm run v92-20:check", "V92.20 gate is not in prebuild");
must(worker, "miles-meals-static-v92-20", "V92.20 PWA cache missing");

for (const marker of [
  'const loadingKind = showCopy ? "action" : "route"',
  "trip-loading-${loadingKind}-overlay",
  "trip-loading-${loadingKind}-card",
  'data-loading-kind={loadingKind}',
]) must(loading, marker, `V92.20 loader kind marker missing: ${marker}`);

for (const marker of [
  'className="trip-loading-card trip-loading-route-card pwa-launch-card"',
  'className="trip-loading-brand"',
  'className="trip-loading-foot"',
]) must(launch, marker, `V92.20 matching PWA loader shell missing: ${marker}`);

if (launch.includes('className="pwa-launch-art"')) {
  throw new Error("V92.20 still uses the mismatched legacy PWA launch artwork");
}

for (const marker of [
  "const MINIMUM_SPLASH_MS = 240",
  "const DISMISS_ANIMATION_MS = 140",
  "const elapsed = performance.now()",
  "window.requestAnimationFrame(dismiss)",
]) must(dismiss, marker, `V92.20 hydration-based splash dismissal missing: ${marker}`);

if (dismiss.includes('window.addEventListener("load"')) {
  throw new Error("V92.20 PWA launch still waits for the full browser load event");
}

for (const marker of [
  "/* V92.20 · stable loading without flip, jump or double wait",
  ".trip-loading-route-overlay",
  "animation: v92-route-loader-reveal 100ms ease-out 140ms forwards",
  ".trip-loading-action-overlay",
  "height: 100svh",
  "contain: layout",
  "backdrop-filter: none",
  "animation: none",
]) must(css, marker, `V92.20 stable loading style missing: ${marker}`);

const loadingRules = css.slice(
  css.indexOf(".v92-loading-halo {"),
  css.indexOf("/* V92.3 · quiet blue selection"),
);
for (const unsafeMotion of ["rotate(", "scale(", "translateX("]) {
  if (loadingRules.includes(unsafeMotion)) {
    throw new Error(`V92.20 loading geometry still moves with ${unsafeMotion}`);
  }
}

for (const marker of [
  "window.innerWidth - document.documentElement.clientWidth",
  "previousBodyPaddingRight",
  "document.body.style.paddingRight",
]) must(saving, marker, `V92.20 desktop scroll-lock compensation missing: ${marker}`);

console.log("V92.20 stable Web and PWA loading gate passed.");
