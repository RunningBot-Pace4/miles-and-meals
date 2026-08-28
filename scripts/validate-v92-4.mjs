import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const starter = read("src/components/LivingJourneyStarter.tsx");
const halo = read("src/components/LivingJourneyHalo.tsx");
const nav = read("src/components/MobileNav.tsx");
const css = read("src/app/v92-living-journey.css");

must(packageJson, '"version": "1.92.4"', "V92.4 package version missing");
must(packageJson, '"v92-4:check"', "V92.4 release gate missing");
must(packageJson, "npm run v92-4:check", "V92.4 gate is not part of prebuild");
must(worker, "miles-meals-static-v92-4", "V92.4 service-worker cache missing");

for (const source of [starter, halo]) {
  must(source, "onPointerDown={() => setActiveMode(mode)}", "Halo selection is not immediate on touch");
  must(source, "data-active-mode={activeMode}", "Halo panel does not expose its active mode");
  must(source, "key={activeMode}", "Halo panel transition is not reset for each mode");
}

for (const marker of [
  "pendingHref",
  'data-navigation-pending={pendingHref ? "true" : undefined}',
  'pendingHref === link.href ? "navigation-pending" : ""',
  "onPointerCancel={() => setPendingHref(null)}",
]) must(nav, marker, `Immediate bottom-navigation feedback missing: ${marker}`);

for (const marker of [
  "-webkit-tap-highlight-color: transparent",
  "touch-action: manipulation",
  'button[role="tab"]:active',
  "background: white !important",
  "min-height: 40px !important",
  "@keyframes v92-mode-panel-in",
  '.mobile-nav[data-navigation-pending="true"]',
  ".nav-item.navigation-pending:not(.nav-action)",
  "calc(6.7rem + env(safe-area-inset-bottom))",
  "@media (min-width: 1024px)",
]) must(css, marker, `Shared web/PWA responsive treatment missing: ${marker}`);

console.log("V92.4 mobile video regression, web/PWA touch feedback and responsive layout validation passed.");
