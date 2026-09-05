import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/v92-living-journey.css", "utf8");

describe("V92.6 stationary Living Journey tabs", () => {
  it("keeps all four controls in equal grid columns", () => {
    expect(css).toContain(".journey-mode-switcher {");
    expect(css).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(css).toContain("gap: clamp(0.5rem, 2.5vw, 0.8rem);");
  });

  it("locks every mode button to its grid cell", () => {
    expect(css).toContain(".journey-mode-switcher > .journey-mode,");
    expect(css).toContain("width: 100% !important;");
    expect(css).toContain("min-width: 0 !important;");
    expect(css).toContain("margin: 0 !important;");
    expect(css).toContain("contain: layout paint;");
  });

  it("does not translate selected, focused, hovered or pressed tabs", () => {
    const fixedControls = css.slice(css.indexOf("/* V92.7 · structurally isolated Halo controls"));
    expect(fixedControls).toContain(".journey-mode-switcher > .journey-mode:hover");
    expect(fixedControls).toContain('.journey-mode-switcher > .journey-mode[aria-selected="true"]');
    expect(fixedControls).toContain("transform: none !important;");
  });

  it("uses only the approved inset blue selection outline", () => {
    expect(css).toContain("border-color: var(--v92-blue) !important;");
    expect(css).toContain("background: white !important;");
    expect(css).toContain("box-shadow: inset 0 0 0 1px var(--v92-blue) !important;");
  });
});
