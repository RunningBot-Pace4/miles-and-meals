import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};
const mustExist = (file) => {
  if (!fs.existsSync(file)) throw new Error(`V91.1 source missing: ${file}`);
};

const packageJson = read("package.json");
const cleanup = read("scripts/cleanup-next-cache.mjs");
const layout = read("src/app/layout.tsx");
const livingCss = read("src/app/living-journey.css");
const nextConfig = read("next.config.ts");
const manifest = read("public/manifest-v91-1.webmanifest");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.91.1"', "V91.1 package version missing");
for (const marker of [
  '"cleanup:next"',
  '"cleanup:next-types"',
  "npm run cleanup:next && npm run cleanup:legacy",
  "npm run cleanup:next-types && tsc --noEmit",
  '"v91-1:check"',
]) must(packageJson, marker, `V91.1 stale-route recovery missing: ${marker}`);

for (const marker of [".next/types", ".next/dev/types", "rmSync"]) {
  must(cleanup, marker, `V91.1 Next type cleanup is incomplete: ${marker}`);
}

const globalsPosition = layout.indexOf('import "@/app/globals.css"');
const livingPosition = layout.indexOf('import "@/app/living-journey.css"');
if (globalsPosition < 0 || livingPosition <= globalsPosition) {
  throw new Error("Living Journey must load after the legacy global stylesheet");
}

for (const marker of [
  "v91.1 final cascade recovery",
  'grid-template-areas:',
  '"main mark"',
  "max-width: 820px",
  "max-width: 430px",
  "max-width: 360px",
  "overflow-x: clip",
]) must(livingCss, marker, `V91.1 responsive cascade guard missing: ${marker}`);

for (const file of [
  "src/app/icon.png",
  "src/app/apple-icon.png",
  "src/app/favicon.ico",
  "public/manifest-v91-1.webmanifest",
  "public/icons/v91-1/icon-192.png",
  "public/icons/v91-1/icon-512.png",
  "public/icons/v91-1/icon-maskable-192.png",
  "public/icons/v91-1/icon-maskable-512.png",
  "public/icons/v91-1/apple-touch-icon-180.png",
  "public/icons/v91-1/notification-icon-96.png",
  "public/icons/v91-1/living-journey-loader.gif",
]) mustExist(file);

must(layout, "/manifest-v91-1.webmanifest", "Layout does not use the versioned manifest");
must(manifest, "/icons/v91-1/icon-192.png", "Versioned manifest icon missing");
must(worker, "miles-meals-static-v91-1", "V91.1 service-worker cache missing");
must(worker, "/icons/v91-1/notification-icon-96.png", "Versioned notification mark missing");
must(nextConfig, 'source: "/sw.js"', "Service worker cache headers missing");
must(nextConfig, 'source: "/manifest-v91-1.webmanifest"', "Manifest cache headers missing");
must(nextConfig, "no-cache, no-store, must-revalidate", "PWA metadata is still cacheable");

for (const retired of [
  "src/app/(app)/inbox/page.tsx",
  "src/app/api/trip-inbox/route.ts",
  "src/app/api/trip-inbox/[id]/add-to-plan/route.ts",
]) {
  if (fs.existsSync(retired)) throw new Error(`Retired Trip Inbox route returned: ${retired}`);
}

console.log("V91.1 stale-route recovery, final Living Journey cascade and versioned PWA identity validation passed.");
