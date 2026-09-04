import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function must(source, marker, message) {
  if (!source.includes(marker)) {
    throw new Error(message);
  }
}

const packageJson = read("package.json");
const worker = read("public/sw.js");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const greeting = read("src/lib/journey-greeting.ts");
const css = read("src/app/v92-living-journey.css");
const test = read("tests/journey-greeting.test.ts");

must(packageJson, '"version": "1.92.23"', "V92.23 package version missing");
must(packageJson, '"v92-23:check"', "V92.23 release gate missing");
must(packageJson, "npm run v92-23:check", "V92.23 gate is not in prebuild");
must(worker, "miles-meals-static-v92-23", "V92.23 PWA cache missing");

for (const marker of [
  "buildJourneyGreeting",
  "journeyGreeting.context",
  "journeyGreeting.title",
  "journeyGreeting.subtitle",
]) {
  must(dashboard, marker, `Contextual dashboard rendering missing: ${marker}`);
}

if (dashboard.includes("Welcome back,")) {
  throw new Error("Generic dashboard welcome was not removed");
}

for (const marker of [
  "YOUR NEXT JOURNEY",
  "YOUR JOURNEYS",
  "THE COUNTDOWN IS ON",
  "TODAY’S JOURNEY",
  "ONE FOR THE MEMORIES",
  'tone: "upcoming"',
  'tone: "active"',
  'tone: "complete"',
]) {
  must(greeting, marker, `Journey greeting state missing: ${marker}`);
}

for (const marker of [
  "/* V92.23 · contextual journey greeting",
  ".dashboard-welcome.journey-greeting",
  ".journey-greeting-meta",
  ".journey-greeting-subtitle",
  "@media (max-width: 719px)",
  "@media (max-width: 360px)",
]) {
  must(css, marker, `Responsive greeting style missing: ${marker}`);
}

must(test, "shows a precise upcoming-trip countdown", "Upcoming greeting test missing");
must(test, "recognizes a trip that is happening today", "Active greeting test missing");
must(test, "moves an ended trip into the memories state", "Completed greeting test missing");

console.log("V92.23 contextual journey greeting gate passed.");
