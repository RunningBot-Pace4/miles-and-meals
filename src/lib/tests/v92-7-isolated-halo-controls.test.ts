import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/v92-living-journey.css", "utf8");
const starter = readFileSync("src/components/LivingJourneyStarter.tsx", "utf8");
const halo = readFileSync("src/components/LivingJourneyHalo.tsx", "utf8");

describe("V92.7 structurally isolated Halo controls", () => {
  it.each([starter, halo])("moves tablist semantics to an independent fixed-grid wrapper", (source) => {
    expect(source).toContain('className="journey-mode-switcher"');
    expect(source).toContain('role="tablist"');
    expect(source).not.toContain('activeMode === mode ? " active"');
  });

  it("separates the circle and mode controls into two grid rows", () => {
    const rules = css.slice(css.indexOf("/* V92.7 · structurally isolated Halo controls"));
    expect(rules).toContain('"core"');
    expect(rules).toContain('"modes" !important;');
    expect(rules).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
  });

  it("neutralizes every legacy positional rule on each button", () => {
    const rules = css.slice(css.indexOf("/* V92.7 · structurally isolated Halo controls"));
    expect(rules).toContain("grid-area: auto !important;");
    expect(rules).toContain("position: static !important;");
    expect(rules).toContain("inset: auto !important;");
    expect(rules).toContain("width: 100% !important;");
    expect(rules).toContain("height: 40px !important;");
    expect(rules).toContain("transform: none !important;");
  });
});
