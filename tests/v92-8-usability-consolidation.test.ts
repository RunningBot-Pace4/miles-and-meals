import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.8 usability and consolidated Home", () => {
  it("uses an accessible eye icon on every password form", () => {
    ["LoginForm", "RegisterForm", "ChangePasswordForm"].forEach((name) => {
      const source = read(`src/components/${name}.tsx`);
      expect(source).toContain("PasswordVisibilityIcon");
      expect(source).toMatch(/aria-label=\{[^}]*password/i);
    });
  });

  it("makes expense category selection visible and explains saved groups", () => {
    const source = read("src/components/ExpenseForm.tsx");
    expect(source).toContain('aria-pressed={category === item.value}');
    expect(source).toContain('className="split-preset-details"');
    expect(source).toContain("remembers who shares, not the amount");
  });

  it("keeps one Home design with real trip and wallet data", () => {
    const dashboard = read("src/app/(app)/dashboard/page.tsx");
    const halo = read("src/components/LivingJourneyHalo.tsx");
    expect(dashboard).not.toContain("living-journey-trip-hero");
    expect(halo).toContain('className="journey-context-strip"');
    expect(halo).toContain("props.myShareSpent");
    expect(halo).toContain("props.tripGroupSpend");
  });

  it("provides compact controls and a stable settlement grid", () => {
    const css = read("src/app/v92-living-journey.css");
    const rules = css.slice(css.indexOf("/* V92.8 · compact entry and one connected Home"));
    expect(rules).toContain('input[type="date"]');
    expect(rules).toContain('.category-chip[aria-pressed="true"]');
    expect(rules).toContain(".settlement-panel > .panel-title");
    expect(rules).toContain('grid-template-areas: "icon copy amount action"');
    expect(rules).toContain(".journey-wallet-summary");
  });
});
