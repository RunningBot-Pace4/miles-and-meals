import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};

const packageJson = read("package.json");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const starter = read("src/components/LivingJourneyStarter.tsx");
const halo = read("src/components/LivingJourneyHalo.tsx");
const css = read("src/app/living-journey.css");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.92.25"', "V91.2-or-newer package version missing");
must(packageJson, '"v91-2:check"', "V91.2 validation command missing");
must(worker, "miles-meals-static-v92-25", "V91.2-or-newer PWA cache bump missing");

for (const marker of [
  'import { LivingJourneyStarter }',
  '<LivingJourneyStarter isAdmin={admin} />',
  "selectedTrip ? (",
]) must(dashboard, marker, `V91.2 Home-state switch missing: ${marker}`);

if (dashboard.includes("dashboard-self-service-empty")) {
  throw new Error("The old card-only no-Trip Home still exists");
}

for (const marker of [
  "Move",
  "Plan",
  "Spend",
  "People",
  'role="tablist"',
  "Create my first Trip",
  "Four travel systems. One connected trip.",
  "The Halo uses real Trip data",
]) must(starter, marker, `V91.2 interactive starter Halo missing: ${marker}`);

for (const marker of ["todayMyShare", "waitingForMe", "nextTitle", "travelerCount"]) {
  must(halo, marker, `Active-Trip Halo lost live data: ${marker}`);
}

for (const marker of [
  "v91.2 · The Living Journey begins before the first Trip exists",
  ".living-journey-starter",
  ".journey-start-steps",
  "max-width: 430px",
  "overflow-wrap: anywhere",
]) must(css, marker, `V91.2 responsive design missing: ${marker}`);

console.log("V91.2 interactive empty/active Living Journey Home validation passed.");
