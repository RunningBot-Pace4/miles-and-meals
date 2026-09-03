import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const css = readFileSync("src/app/v92-living-journey.css", "utf8");
const geometry = readFileSync("e2e/v92-17-viewport-keyboard.spec.ts", "utf8");

describe("V92.17 fitted viewport and keyboard-safe expense editor", () => {
  it("publishes a device-width fixed-scale viewport", () => {
    expect(layout).toContain('width: "device-width"');
    expect(layout).toContain("initialScale: 1");
    expect(layout).toContain("minimumScale: 1");
    expect(layout).toContain("maximumScale: 1");
    expect(layout).toContain("userScalable: false");
  });

  it("prevents iOS input-focus zoom on every phone form", () => {
    const rules = css.slice(css.indexOf("/* V92.17 · stable phone viewport"));
    expect(rules).toContain("@media (max-width: 719px)");
    expect(rules).toContain('input:not([type="checkbox"]):not([type="radio"]):not([type="range"])');
    expect(rules).toContain("font-size: 16px !important");
    expect(rules).toContain("-webkit-text-size-adjust: 100%");
  });

  it("removes the expense Save overlay only while a phone field is focused", () => {
    expect(css).toContain(".expense-editor:has(input:focus, select:focus, textarea:focus) .sticky-save");
    expect(css).toContain("position: static !important");
    expect(css).toContain("inset: auto !important");
  });

  it("covers phone, small-tablet and desktop geometry", () => {
    expect(geometry).toContain("320, 360, 390, 430, 600, 719");
    expect(geometry).toContain("inputFontSize");
    expect(geometry).toContain('savePosition).toBe("static")');
    expect(geometry).toContain('toHaveCSS("position", "sticky")');
  });
});
