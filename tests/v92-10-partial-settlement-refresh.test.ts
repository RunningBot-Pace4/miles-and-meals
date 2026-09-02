import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const action = readFileSync("src/components/SettlementActionButton.tsx", "utf8");
const workspace = readFileSync("src/components/LiveSettlementWorkspace.tsx", "utf8");
const css = readFileSync("src/app/v92-living-journey.css", "utf8");

describe("V92.10 automatic partial-settlement refresh", () => {
  it("refreshes settlement data immediately after a successful action", () => {
    expect(action).toContain("SETTLEMENT_UPDATED_EVENT");
    expect(action).toContain("window.dispatchEvent");
    expect(workspace).toContain("refreshImmediately");
    expect(workspace).toContain("void refresh(true)");
  });

  it("resets the input when the outstanding maximum changes", () => {
    expect(action).toContain("useEffect(() =>");
    expect(action).toContain("setAmount(maximumAmount.toFixed(2))");
    expect(action).toContain("setAwaitingRefresh(false)");
    expect(action).toContain("[maximumAmount]");
  });

  it("blocks duplicate taps until the refreshed balance arrives", () => {
    expect(action).toContain("busy || awaitingRefresh");
    expect(action).toContain("Refreshing balance…");
    expect(action).toContain("submittedActionRef");
  });

  it("shows clear partial-receipt and remaining-balance feedback", () => {
    expect(action).toContain('"MARK_RECEIVED" ? "receipt" : "payment"');
    expect(action).toContain("remains.");
    expect(action).toContain('className="settlement-action-success"');
    expect(css).toContain("/* V92.10 · automatic partial-settlement refresh");
  });
});
