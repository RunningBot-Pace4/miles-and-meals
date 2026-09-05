import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/v92-living-journey.css", "utf8");
const dashboard = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");
const geometry = readFileSync("e2e/v92-12-pwa-layout.spec.ts", "utf8");
const fullAudit = readFileSync("e2e/v92-9-full-pwa-audit.spec.ts", "utf8");
const publicAudit = readFileSync("e2e/public-pwa.spec.ts", "utf8");

describe("V92.14 complete Web/PWA responsive contract", () => {
  it("gives attention cards a dedicated phone layout with uncut copy", () => {
    const rules = css.slice(css.indexOf("/* V92.14 · full Web/PWA responsive contract"));
    expect(rules).toContain(".dashboard-action-heading");
    expect(rules).toContain("grid-template-columns: 42px minmax(0, 1fr) !important");
    expect(rules).toContain("white-space: normal");
    expect(rules).toContain("overflow-wrap: anywhere");
    expect(rules).toContain("position: absolute");
  });

  it("shortens attention wording without losing the required action", () => {
    expect(dashboard).toContain("completed trip");
    expect(dashboard).toContain("still accepts");
    expect(dashboard).toContain("Lock the expense ledger once everyone has finished adding spending.");
  });

  it("hardens shared rows, actions, data grids, and table containment", () => {
    const rules = css.slice(css.indexOf("/* V92.14 · full Web/PWA responsive contract"));
    for (const marker of [
      ".menu-row",
      ".notification-center-item-main",
      ".offline-document-row",
      ".settlement-history-row",
      ".receipt-review-row",
      ".admin-user-row",
      ".table-wrap, .table-scroll, .responsive-table",
    ]) expect(rules).toContain(marker);
  });

  it("measures the reported action cards and every authenticated page family", () => {
    for (const marker of [
      "actionHeadingSameRow",
      "actionCopyHasRoom",
      "actionArrowInsideCard",
      "actionTextFits",
    ]) expect(geometry).toContain(marker);
    expect(fullAudit).toContain("responsiveRows");
    expect(fullAudit).toContain("clippedActionCopy");
    expect(fullAudit).toContain("final content hidden by bottom navigation");
  });

  it("also sweeps login, registration, recovery, and offline public surfaces", () => {
    for (const route of ["/login", "/register", "/forgot-password", "/offline.html"]) {
      expect(publicAudit).toContain(`"${route}"`);
    }
    expect(publicAudit).toContain("320, 360, 390, 430, 600, 768, 820, 1024");
  });
});
