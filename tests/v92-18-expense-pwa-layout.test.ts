import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = readFileSync("package.json", "utf8");
const worker = readFileSync("public/sw.js", "utf8");
const form = readFileSync("src/components/ExpenseForm.tsx", "utf8");
const css = readFileSync("src/app/v92-living-journey.css", "utf8");
const geometry = readFileSync("e2e/v92-18-expense-pwa-layout.spec.ts", "utf8");
const rules = css.slice(css.indexOf("/* V92.18 · fixed expense canvas"));

describe("V92.18 expense PWA layout correction", () => {
  it("publishes a distinct release and service-worker cache", () => {
    expect(packageJson).toContain('"version": "1.92.26"');
    expect(packageJson).toContain('"v92-18:check"');
    expect(packageJson).toContain("npm run v92-18:check");
    expect(worker).toContain("miles-meals-static-v92-26");
  });

  it("uses a compact professional receipt action", () => {
    expect(form).toContain('<p className="eyebrow">EXPENSE</p>');
    expect(form).toContain('className="expense-scan-icon"');
    expect(form).toContain('<svg viewBox="0 0 24 24"');
    expect(form).toContain("Take a photo or choose one");
    expect(form).not.toContain('<span className="expense-scan-icon">📷</span>');
    expect(rules).toContain("border: 1.5px solid var(--v92-blue) !important");
  });

  it("keeps the mobile Save action in normal form flow at all times", () => {
    expect(rules).toContain(".expense-editor .sticky-save");
    expect(rules).toContain("position: static !important");
    expect(rules).toContain("padding-bottom: 0 !important");
    expect(rules).toContain("backdrop-filter: none");
  });

  it("removes the expense selector and page-width horizontal scroll paths", () => {
    expect(rules).toContain("html:has(.expense-editor)");
    expect(rules).toContain("overscroll-behavior-x: none");
    expect(rules).toContain("grid-template-columns: repeat(4, minmax(0, 1fr)) !important");
    expect(rules).toContain("overflow-x: hidden !important");
    expect(rules).toContain("touch-action: pan-y");
  });

  it("covers fitted phone and small-tablet geometry before and after focus", () => {
    expect(geometry).toContain("320, 360, 390, 430, 600, 719");
    expect(geometry).toContain("window.scrollTo(120, 0)");
    expect(geometry).toContain("scrollX");
    expect(geometry).toContain('savePosition).toBe("static")');
    expect(geometry).toContain('toHaveCSS("position", "sticky")');
  });
});
