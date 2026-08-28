import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V92.5 Living Journey mode layout", () => {
  const starter = read("src/components/LivingJourneyStarter.tsx");
  const halo = read("src/components/LivingJourneyHalo.tsx");
  const css = read("src/app/v92-living-journey.css");

  it("keeps all four starter panels mounted in one stack", () => {
    expect(starter).toContain('className="journey-panel-stack"');
    expect(starter).toContain("{modes.map((mode) => {");
    expect(starter).toContain("aria-hidden={!selected}");
    expect(starter).not.toContain("key={activeMode}");
  });

  it("uses the same stable structure for Trips with live data", () => {
    expect(halo).toContain('className="journey-panel-stack"');
    expect(halo).toContain("{modeOrder.map((mode) => {");
    expect(halo).toContain("aria-hidden={!selected}");
    expect(halo).not.toContain("key={activeMode}");
  });

  it("overlaps panels in one equal-height grid cell", () => {
    expect(css).toContain(".journey-panel-stack {");
    expect(css).toContain("grid-area: 1 / 1");
    expect(css).toContain("visibility: hidden");
    expect(css).toContain(".journey-panel-stack > .journey-live-panel.is-active");
  });

  it("changes visibility without translating the page layout", () => {
    expect(css).toContain("visibility: visible");
    expect(css).toContain("pointer-events: auto");
    expect(css).not.toContain("@keyframes v92-mode-panel-in");
  });
});
