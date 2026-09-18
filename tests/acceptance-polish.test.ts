import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("acceptance polish source safeguards", () => {
  it("separates optional ideas from the attention count", () => {
    const page = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");
    expect(page).toContain('reminders.filter(item => item.priority !== "IDEA")');
    expect(page).toContain('optionalIdeas = reminders.filter(item => item.priority === "IDEA")');
    expect(page).toContain("{actionItems.length} open");
    expect(page).toContain("Optional ideas — nothing you need to complete.");
  });

  it("overrides logical upload sizing and anchors it inside its label", () => {
    const css = readFileSync("src/app/bill-history.css", "utf8");
    const rule = css.match(/\.expense-editor \.expense-scan-action \.receipt-file-input\s*\{([^}]+)\}/)?.[1];
    expect(rule).toBeTruthy();
    expect(rule).toContain("inline-size: 1px;");
    expect(rule).toContain("inset: 0 auto auto 0;");
    expect(rule).toContain("padding: 0;");
    expect(css).toContain(".expense-editor .expense-scan-action:focus-within");
  });
});
