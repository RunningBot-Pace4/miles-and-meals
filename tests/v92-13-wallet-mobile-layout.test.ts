import {
  readFileSync,
} from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const css = readFileSync(
  "src/app/v92-living-journey.css",
  "utf8",
);
const finance = readFileSync(
  "src/components/LiveDashboardFinance.tsx",
  "utf8",
);
const e2e = readFileSync(
  "e2e/v92-12-pwa-layout.spec.ts",
  "utf8",
);

describe("V92.13 intentional wallet layout", () => {
  it("keeps both wallet headings and actions on one mobile row", () => {
    const rules = css.slice(
      css.indexOf(
        "/* V92.13 · intentional three-card wallet geometry",
      ),
    );

    expect(rules).toContain(
      ".dashboard-budget-section .travel-section-heading.compact",
    );
    expect(rules).toContain(
      "grid-template-columns: minmax(0, 1fr) auto !important",
    );
    expect(rules).toContain(
      "> :is(.panel-link, span)",
    );
  });

  it("features the first card and pairs the other two without an empty cell", () => {
    const rules = css.slice(
      css.indexOf(
        "/* V92.13 · intentional three-card wallet geometry",
      ),
    );

    expect(rules).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr)) !important",
    );
    expect(rules).toContain(
      ".travel-stat:first-child",
    );
    expect(rules).toContain(
      "grid-column: 1 / -1",
    );
    expect(rules).toContain(
      "@media (max-width: 360px)",
    );
  });

  it("retains all three personal and group wallet values", () => {
    for (const label of [
      "My budget",
      "My share spent",
      "My remaining",
      "Combined budget",
      "Trip expenses",
      "Group remaining",
    ]) {
      expect(finance).toContain(
        `label="${label}"`,
      );
    }
  });

  it("measures wallet geometry with the PWA dashboard harness", () => {
    expect(e2e).toContain(
      "budgetHeadingSameRow",
    );
    expect(e2e).toContain(
      "firstBudgetCardIsFeatured",
    );
    expect(e2e).toContain(
      "lowerBudgetCardsShareRow",
    );
    expect(e2e).toContain(
      "allBudgetCardsShareRow",
    );
  });
});
