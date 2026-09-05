import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V91.2 Living Journey Home", () => {
  const dashboard = read("src/app/(app)/dashboard/page.tsx");
  const starter = read("src/components/LivingJourneyStarter.tsx");
  const active = read("src/components/LivingJourneyHalo.tsx");
  const css = read("src/app/living-journey.css");
  const currentCss = read("src/app/v92-living-journey.css");

  it("shows an interactive Halo even before the first Trip exists", () => {
    expect(dashboard).toContain("<LivingJourneyStarter isAdmin={admin} />");
    expect(dashboard).not.toContain("dashboard-self-service-empty");
    for (const mode of ["Move", "Plan", "Spend", "People"]) {
      expect(starter).toContain(mode);
    }
    expect(starter).toContain('role="tablist"');
  });

  it("switches to real Trip data after a Trip exists", () => {
    expect(dashboard).toContain("<LivingJourneyHalo");
    for (const dataPoint of ["nextTitle", "todayMyShare", "travelerCount", "waitingForMe"]) {
      expect(active).toContain(dataPoint);
    }
  });

  it("prevents the oversized empty-state title and contains the starter on phones", () => {
    expect(currentCss).toContain("clamp(2rem, 5vw, 4.2rem)");
    expect(css).toContain(".living-journey-starter");
    expect(css).toContain(".journey-start-steps");
    expect(css).toContain("max-width: 430px");
  });
});
