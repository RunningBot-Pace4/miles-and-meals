import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.9 calendar and PWA alignment", () => {
  it("keeps the date range trigger compact and moves guidance into the open calendar", () => {
    const picker = read("src/components/DateRangePicker.tsx");
    expect(picker).toContain('className="date-range-instruction"');
    expect(picker).toContain('className="text-button date-range-done"');
    expect(picker).toContain('isToday ? "today"');
    expect(picker).not.toContain('className="date-range-guidance"');
    expect(picker).not.toContain('className="date-range-help"');
  });

  it("standardises every native calendar and time field", () => {
    const css = read("src/app/v92-living-journey.css");
    const rules = css.slice(css.indexOf("/* V92.9 · calendar system and complete PWA alignment"));
    expect(rules).toContain('input[type="date"]');
    expect(rules).toContain('input[type="datetime-local"]');
    expect(rules).toContain("height: 46px !important");
    expect(rules).toContain("color-scheme: light !important");
  });

  it("gives the mobile settlement action a full-width structural row", () => {
    const css = read("src/app/v92-living-journey.css");
    const rules = css.slice(css.indexOf("/* V92.9 · calendar system and complete PWA alignment"));
    expect(rules).toContain("grid-template-areas: none !important");
    expect(rules).toContain("grid-column: 1 / -1 !important");
    expect(rules).toContain(".settlement-partial-amount > span:first-child");
    expect(rules).toContain("border: 0 !important");
  });

  it("retains explicit 320, 360, 390 and 430 pixel audit coverage", () => {
    const e2e = read("e2e/v92-9-responsive-components.spec.ts");
    const fullPwaE2e = read("e2e/v92-9-full-pwa-audit.spec.ts");
    for (const width of [320, 360, 390, 430]) expect(e2e).toContain(String(width));
    for (const width of [320, 360, 390, 430]) expect(fullPwaE2e).toContain(String(width));
    expect(e2e).toContain("actionWidth");
    expect(e2e).toContain("calendarRight");
    expect(fullPwaE2e).toContain("narrowTextControls");
    expect(fullPwaE2e).toContain('"/more"');
  });
});
