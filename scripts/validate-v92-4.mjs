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

must(packageJson, '"version": "1.92.15"', "V92.4-or-newer package version missing");
must(packageJson, '"v92-4:check"', "V92.4 release gate missing");
must(packageJson, "npm run v92-4:check", "V92.4 gate is not part of prebuild");
must(worker, "miles-meals-static-v92-15", "V92.4-or-newer service-worker cache missing");

for (const source of [starter, halo]) {
  must(source, "onPointerDown={() => setActiveMode(mode)}", "Halo selection is not immediate on touch");
  must(source, 'className="journey-panel-stack"', "Halo panels are not held in a stable stack");
  must(source, 'selected ? " is-active" : ""', "Halo stack does not expose its active panel");
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
  ".journey-panel-stack > .journey-live-panel.is-active",
  '.mobile-nav[data-navigation-pending="true"]',
  ".nav-item.navigation-pending:not(.nav-action)",
  "calc(6.7rem + env(safe-area-inset-bottom))",
  "@media (min-width: 1024px)",
]) must(css, marker, `Shared web/PWA responsive treatment missing: ${marker}`);

console.log("V92.4 mobile video regression, web/PWA touch feedback and responsive layout validation passed.");
