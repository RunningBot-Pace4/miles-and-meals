import { describe, expect, it } from "vitest";
import { needsDocumentIndicator } from "@/lib/navigation-feedback";

describe("native navigation feedback", () => {
  const current = "https://example.test/spend?tab=payments";
  it.each(["#history", current, `${current}#history`, "https://other.test/spend", "mailto:hello@example.test"])("does not obscure same-document or external navigation: %s", href => {
    expect(needsDocumentIndicator(href, current)).toBe(false);
  });
  it.each(["/dashboard", "?tab=budgets", "/expenses/123", "/spend"])("shows feedback for a new document: %s", href => {
    expect(needsDocumentIndicator(href, current)).toBe(true);
  });
});
