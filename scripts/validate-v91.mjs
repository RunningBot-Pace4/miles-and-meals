import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};
const mustExist = (file) => {
  if (!fs.existsSync(file)) throw new Error(`V91 source missing: ${file}`);
};

const packageJson = read("package.json");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const halo = read("src/components/LivingJourneyHalo.tsx");
const brand = read("src/components/BrandLogo.tsx");
const loading = read("src/components/BrandedLoadingScreen.tsx");
const layout = read("src/app/layout.tsx");
const manifest = JSON.parse(read("public/manifest.webmanifest"));
const serviceWorker = read("public/sw.js");
const offline = read("public/offline.html");
const css = `${read("src/app/globals.css")}\n${read("src/app/living-journey.css")}\n${read("src/app/v92-living-journey.css")}`;
const e2e = read("e2e/mobile-v91-living-journey.spec.ts");
const tests = read("tests/v91-living-journey.test.ts");

must(packageJson, '"version": "1.92.12"', "V91-or-newer package version missing");
must(packageJson, '"v91:check"', "V91 validation command missing");
must(serviceWorker, "miles-meals-static-v92-12", "V91-or-newer service-worker cache was not bumped");

for (const file of [
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-maskable-192.png",
  "public/icons/icon-maskable-512.png",
  "public/icons/apple-touch-icon-180.png",
  "public/icons/notification-icon-96.png",
  "public/icons/living-journey-loader.gif",
]) mustExist(file);

const purposes = manifest.icons.map((icon) => icon.purpose);
if (!purposes.includes("any") || !purposes.includes("maskable")) {
  throw new Error("V91 manifest must keep separate standard and maskable icons");
}
if (manifest.theme_color !== "#ffffff" || manifest.background_color !== "#f7f8fa") {
  throw new Error("V92 manifest does not use the approved light Living Journey launch palette");
}

for (const marker of ["LivingJourneyHalo", "initialMode", "todayMyShare", "waitingForMe"]) {
  must(dashboard, marker, `Dashboard is missing Living Journey data: ${marker}`);
}
for (const marker of ["Move", "Plan", "Spend", "People", 'role="tablist"', "aria-selected", "/documents", "/settlements"]) {
  must(halo, marker, `Living Journey Halo is incomplete: ${marker}`);
}
for (const marker of ["v91 · Living Journey design system", ".living-journey-shell", ".journey-halo", ".journey-live-panel", "max-width: 640px", "max-width: 360px", "prefers-reduced-motion"]) {
  must(css, marker, `V91 design-system gate missing: ${marker}`);
}
must(brand, "/icons/v92/icon-192.png", "Brand does not use the current Living Journey mark");
must(loading, "v92-loading-halo", "Loading state does not use the light Halo progress treatment");
must(layout, "Getting your trip ready", "PWA launch copy is not updated");
must(offline, "Your trip keeps moving.", "Offline experience is not updated");
must(serviceWorker, "/icons/v92/notification-icon-96.png", "Notification badge is not versioned for V92");

for (const marker of ["320", "360", "390", "430", "Move", "Plan", "Spend", "People", "no horizontal overflow"]) {
  must(e2e, marker, `V91 mobile interaction audit missing: ${marker}`);
  must(tests, marker, `V91 release regression evidence missing: ${marker}`);
}

console.log("V91 Living Journey design, PWA identity and responsive interaction validation passed.");
