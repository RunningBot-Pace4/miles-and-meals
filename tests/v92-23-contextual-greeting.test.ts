import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.23 contextual dashboard greeting", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const dashboard = read("src/app/(app)/dashboard/page.tsx");
  const greeting = read("src/lib/journey-greeting.ts");
  const css = read("src/app/v92-living-journey.css");

  it("publishes a coherent V92.23 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.23"');
    expect(packageJson).toContain('"v92-23:check"');
    expect(packageJson).toContain("npm run v92-23:check");
    expect(worker).toContain("miles-meals-static-v92-23");
  });

  it("replaces the generic welcome with trip-aware wording", () => {
    expect(dashboard).toContain("buildJourneyGreeting");
    expect(dashboard).toContain("journeyGreeting.context");
    expect(dashboard).toContain("journeyGreeting.title");
    expect(dashboard).toContain("journeyGreeting.subtitle");
    expect(dashboard).not.toContain("Welcome back,");

    for (const marker of [
      "YOUR NEXT JOURNEY",
      "YOUR JOURNEYS",
      "THE COUNTDOWN IS ON",
      "TODAY’S JOURNEY",
      "ONE FOR THE MEMORIES",
    ]) {
      expect(greeting).toContain(marker);
    }
  });

  it("keeps the premium hero aligned from narrow PWA to desktop", () => {
    expect(css).toContain("/* V92.23 · contextual journey greeting");
    expect(css).toContain(".dashboard-welcome.journey-greeting");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(css).toContain("@media (max-width: 719px)");
    expect(css).toContain("@media (max-width: 360px)");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("width: 100%");
  });
});
