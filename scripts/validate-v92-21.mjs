import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const navigation = read("src/components/FullPageLink.tsx");
const navigationGate = read("scripts/validate-navigation.mjs");
const css = read("src/app/v92-living-journey.css");
const launch = read("src/app/layout.tsx");
const globalError = read("src/app/global-error.tsx");
const geometry = read("e2e/v92-21-single-navigation.spec.ts");

must(packageJson, '"version": "1.92.24"', "V92.21 package version missing");
must(packageJson, '"v92-21:check"', "V92.21 release gate missing");
must(packageJson, "npm run v92-21:check", "V92.21 gate is not in prebuild");
must(worker, "miles-meals-static-v92-24", "V92.21 PWA cache missing");

for (const marker of [
  'from "next/link"',
  "<NextLink",
  'data-navigation-mode="client"',
  "prefetch = null",
  'data-prefetch-intent={prefetch === false ? "off" : "adaptive"}',
]) must(navigation, marker, `V92.21 single-navigation marker missing: ${marker}`);

for (const forbidden of [
  'data-navigation-mode="document"',
  "createPortal(<BrandedLoadingScreen />",
  "NAVIGATION_INDICATOR_TIMEOUT_MS",
  "NATIVE_NAVIGATION_FALLBACK_MS",
  "window.location.assign(targetUrl.href)",
]) {
  if (navigation.includes(forbidden)) {
    throw new Error(`V92.21 still contains dual-navigation behavior: ${forbidden}`);
  }
}

must(navigationGate, "sharedLinkPath", "V92.21 shared navigation exception missing");

for (const marker of [
  "animation: v92-halo-breathe 1.8s ease-in-out infinite",
  "@keyframes v92-halo-breathe",
  "rotate(-3deg) scale(0.98)",
  "rotate(3deg) scale(1)",
  "@keyframes v92-route-progress",
]) must(css, marker, `V92.21 rotating Halo restoration missing: ${marker}`);

for (const marker of [
  'className="pwa-launch-art"',
  "Getting your trip ready",
  "Plan · Spend · Settle",
]) must(launch, marker, `V92.21 approved PWA loading artwork missing: ${marker}`);

must(globalError, "This page couldn&apos;t open", "V92.21 honest error heading missing");
if (globalError.includes("client-side") || globalError.includes("page transition")) {
  throw new Error("V92.21 global error still mislabels every failure as client navigation");
}

for (const marker of [
  "single client navigation",
  "data-navigation-mode",
  "__mnmClientNavigationProbe",
  "This page couldn't open",
]) must(geometry, marker, `V92.21 browser navigation coverage missing: ${marker}`);

console.log("V92.21 single navigation, rotating Halo and fresh-load recovery gate passed.");
