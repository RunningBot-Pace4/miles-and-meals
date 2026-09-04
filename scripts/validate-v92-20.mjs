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

must(packageJson, '"version": "1.92.24"', "V92.20 package version missing");
must(packageJson, '"v92-20:check"', "V92.20 release gate missing");
must(packageJson, "npm run v92-20:check", "V92.20 gate is not in prebuild");
must(worker, "miles-meals-static-v92-24", "V92.20 PWA cache missing");

for (const marker of [
  'const loadingKind = showCopy ? "action" : "route"',
  "trip-loading-${loadingKind}-overlay",
  "trip-loading-${loadingKind}-card",
  'data-loading-kind={loadingKind}',
]) must(loading, marker, `V92.20 loader kind marker missing: ${marker}`);

for (const marker of [
  'className="pwa-launch-art"',
  "v92-loading-halo",
  "Getting your trip ready",
]) must(launch, marker, `V92.20-or-newer PWA loader marker missing: ${marker}`);

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
  "/* V92.20 · shared loading surface stability; V92.21 restores Halo motion",
  ".trip-loading-route-overlay",
  "animation: v92-route-loader-reveal 100ms ease-out 140ms forwards",
  ".trip-loading-action-overlay",
  "height: 100svh",
  "contain: layout",
  "backdrop-filter: none",
]) must(css, marker, `V92.20 stable loading style missing: ${marker}`);

for (const marker of [
  "window.innerWidth - document.documentElement.clientWidth",
  "previousBodyPaddingRight",
  "document.body.style.paddingRight",
]) must(saving, marker, `V92.20 desktop scroll-lock compensation missing: ${marker}`);

console.log("V92.20 stable Web and PWA loading gate passed.");
