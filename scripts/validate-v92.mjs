import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};
const mustExist = (file) => {
  if (!fs.existsSync(file)) throw new Error(`V92 source missing: ${file}`);
};

const packageJson = read("package.json");
const layout = read("src/app/layout.tsx");
const halo = read("src/components/LivingJourneyHalo.tsx");
const starter = read("src/components/LivingJourneyStarter.tsx");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const loading = read("src/components/BrandedLoadingScreen.tsx");
const nav = read("src/components/MobileNav.tsx");
const contextBack = read("src/components/MobileContextBack.tsx");
const css = read("src/app/v92-living-journey.css");
const manifest = JSON.parse(read("public/manifest-v92.webmanifest"));
const worker = read("public/sw.js");
const offline = read("public/offline.html");
const release = read("START-HERE-V92.md");
const e2e = read("e2e/mobile-v92-light-design.spec.ts");

must(packageJson, '"version": "1.92.14"', "V92.5 package version missing");
must(packageJson, '"v92:check"', "V92 validation command missing");
must(packageJson, "npm run v92:check", "V92 validation is not part of prebuild");

const globalsPosition = layout.indexOf('import "@/app/globals.css"');
const livingPosition = layout.indexOf('import "@/app/living-journey.css"');
const v92Position = layout.indexOf('import "@/app/v92-living-journey.css"');
if (globalsPosition < 0 || livingPosition <= globalsPosition || v92Position <= livingPosition) {
  throw new Error("V92 final light cascade is not loaded last");
}

for (const marker of [
  "V92 · Living Journey — approved light product system",
  "color-scheme: light",
  "--v92-blue: #3d82f6",
  "--v92-yellow: #f5d98b",
  "--v92-peach: #edb18d",
  "--v92-green: #9bd0a5",
  ".journey-halo-core",
  "conic-gradient(",
  ".journey-mode.active",
  "background: #111",
  "@media (min-width: 1024px)",
  "@media (max-width: 640px)",
  "@media (max-width: 360px)",
  "prefers-reduced-motion",
]) must(css, marker, `V92 light design marker missing: ${marker}`);

if (css.includes("#061c33") || css.includes("black-translucent")) {
  throw new Error("The V92 final design layer contains the retired dark presentation");
}

for (const marker of ["Move", "Plan", "Spend", "People", 'role="tablist"', "active.title", "Tap for meaningful detail"]) {
  must(halo, marker, `V92 active Halo marker missing: ${marker}`);
}
for (const marker of ["Move", "Plan", "Spend", "People", "Start your journey", "Create a Trip to connect live data"]) {
  must(starter, marker, `V92 starter Halo marker missing: ${marker}`);
}

const pageFiles = [
  "src/app/(app)/dashboard/page.tsx",
  "src/app/(app)/planner/page.tsx",
  "src/app/(app)/location/page.tsx",
  "src/app/(app)/documents/page.tsx",
  "src/app/(app)/expenses/new/page.tsx",
  "src/app/(app)/expenses/page.tsx",
  "src/app/(app)/receipts/page.tsx",
  "src/app/(app)/settlements/page.tsx",
  "src/app/(app)/trips/page.tsx",
  "src/app/(app)/offline/page.tsx",
  "src/app/(app)/companion/page.tsx",
  "src/app/(app)/memories/page.tsx",
  "src/app/(app)/notifications/page.tsx",
  "src/app/(app)/more/page.tsx",
  "src/app/(app)/settings/profile/page.tsx",
  "src/app/(app)/settings/permissions/page.tsx",
  "src/app/(app)/admin/page.tsx",
];
for (const file of pageFiles) mustExist(file);

for (const file of [
  "public/manifest-v92.webmanifest",
  "public/icons/v92/app-icon.svg",
  "public/icons/v92/icon-192.png",
  "public/icons/v92/icon-512.png",
  "public/icons/v92/icon-maskable-192.png",
  "public/icons/v92/icon-maskable-512.png",
  "public/icons/v92/apple-touch-icon-180.png",
  "public/icons/v92/notification-icon-96.png",
  "public/icons/v92/living-journey-loader.gif",
]) mustExist(file);

if (manifest.theme_color !== "#ffffff" || manifest.background_color !== "#f7f8fa") {
  throw new Error("V92 PWA manifest is not using the light launch palette");
}
for (const icon of manifest.icons) {
  if (!icon.src.startsWith("/icons/v92/")) throw new Error(`Unversioned V92 icon: ${icon.src}`);
}
must(layout, "/manifest-v92.webmanifest", "V92 layout manifest missing");
must(layout, 'statusBarStyle: "default"', "V92 iOS status bar remains dark");
must(worker, "miles-meals-static-v92-14", "V92.5 service-worker cache missing");
must(worker, "/icons/v92/icon-192.png", "V92 notification icon path missing");
must(offline, 'content="#ffffff"', "Offline shell theme is not light");
must(offline, "/icons/v92/icon-192.png", "Offline shell icon is not V92");

for (const marker of ["v92-loading-halo", "v92-loading-halo-ring", "Getting your trip ready"]) {
  must(`${layout}\n${loading}\n${css}`, marker, `V92.1 loading redesign marker missing: ${marker}`);
}
for (const marker of [
  'body > .mobile-nav[data-app-mobile-nav="true"] .nav-item.nav-action',
  "visibility: visible !important",
  "mobile-context-current",
  "Offline & Sync",
  "Notifications",
  'aria-current={active ? "page" : undefined}',
]) must(`${css}\n${nav}\n${contextBack}`, marker, `V92.1 PWA navigation marker missing: ${marker}`);

const visibleCopy = `${dashboard}\n${starter}\n${halo}\n${loading}\n${layout}\n${offline}`;
for (const repeated of ["LIVING JOURNEY ·", "Your Living Journey", "One living journey"]) {
  if (visibleCopy.includes(repeated)) throw new Error(`Repeated visible wording returned: ${repeated}`);
}

for (const marker of ["320", "360", "390", "430", "1024", "no horizontal overflow", "Trip command areas"]) {
  must(e2e, marker, `V92 mobile/desktop audit marker missing: ${marker}`);
}

must(release, "No Neon or database migration is required", "V92 migration guidance missing");
for (const retired of [
  "src/app/(app)/inbox/page.tsx",
  "src/app/api/trip-inbox/route.ts",
  "src/app/api/trip-inbox/[id]/add-to-plan/route.ts",
]) if (fs.existsSync(retired)) throw new Error(`Retired Trip Inbox route returned: ${retired}`);

console.log("V92.1 light Halo design, PWA navigation, loading and responsive release validation passed.");
