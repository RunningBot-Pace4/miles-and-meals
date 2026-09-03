import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/v92-living-journey.css", "utf8");
const offline = readFileSync("src/components/OfflinePackWorkspace.tsx", "utf8");
const permissions = readFileSync("src/components/TripPermissionsManager.tsx", "utf8");
const budgets = readFileSync("src/components/CategoryBudgetManager.tsx", "utf8");
const categoryApi = readFileSync("src/app/api/category-budgets/route.ts", "utf8");
const queue = readFileSync("src/components/OfflineQueueSync.tsx", "utf8");
const fullAudit = readFileSync("e2e/v92-9-full-pwa-audit.spec.ts", "utf8");
const geometry = readFileSync("e2e/v92-15-mobile-control-layout.spec.ts", "utf8");

describe("V92.15 PWA control and editing repair", () => {
  it("uses compact accessible expense-sharing controls", () => {
    expect(offline).toContain('className="offline-share-native-control"');
    expect(offline).toContain('className="offline-share-check"');
    expect(offline).toContain('className="offline-share-name"');
    expect(css).toContain(".offline-share-native-control,");
    expect(css).toContain("min-block-size: 1px !important");
    expect(css).toContain("grid-template-columns: 24px minmax(0, 1fr) !important");
  });

  it("keeps selection styling to a clear blue outline", () => {
    const rules = css.slice(css.indexOf("/* V92.15 · compact mobile controls"));
    expect(rules).toContain(".offline-share-shortcuts button.selected");
    expect(rules).toContain("border-color: var(--v92-blue) !important");
    expect(rules).toContain("background: white !important");
  });

  it("summarizes owner access and separates traveler toggles from their labels", () => {
    expect(permissions).toContain("permission-owner-summary");
    expect(permissions).toContain("Owner permissions are always enabled.");
    expect(permissions).toContain("permission-native-control");
    expect(permissions).toContain("permission-check");
    expect(permissions).toContain("View only · Only the Trip Owner");
  });

  it("makes category editing state and save behavior explicit", () => {
    expect(budgets).toContain("const editingEnabled = canManage");
    expect(budgets).toContain("Editing enabled");
    expect(budgets).toContain("Save limit");
    expect(budgets).toContain('disabled={!editingEnabled}');
    expect(budgets).toContain("Only the Trip Owner can change group category limits.");
    expect(css).toContain("grid-template-columns: minmax(52px, auto) minmax(0, 1fr) !important");
    expect(css).toContain("white-space: nowrap !important");
  });

  it("returns spending even before a category limit exists and normalizes older offline names", () => {
    expect(categoryApi).toContain("categoryOrder.map((category)");
    expect(categoryApi).toContain('(spent.get(category) ?? 0) + toNumber(row.spent)');
    expect(categoryApi).toContain('Accommodation: "Hotel"');
    expect(categoryApi).toContain('Activities: "Attractions"');
    expect(offline).toContain("<option>Hotel</option>");
    expect(offline).toContain("<option>Attractions</option>");
    expect(queue).toContain("canonicalExpenseCategory");
  });

  it("extends the full route audit and adds exact multi-viewport geometry", () => {
    expect(fullAudit).toContain("oversizedBooleanControls");
    expect(fullAudit).toContain("checkbox or radio expanded into the label copy");
    expect(geometry).toContain("320, 360, 390, 430, 600, 719, 768, 1024");
    expect(geometry).toContain("shareSeparated");
    expect(geometry).toContain("permissionSeparated");
    expect(geometry).toContain("prefixFits");
    expect(geometry).toContain("saveInside");
  });
});
