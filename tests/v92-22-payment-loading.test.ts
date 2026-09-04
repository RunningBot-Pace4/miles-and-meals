import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.22 payment details and single loading boundary", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const appLoading = read("src/app/(app)/loading.tsx");
  const workspace = read("src/components/LiveSettlementWorkspace.tsx");
  const css = read("src/app/v92-living-journey.css");

  it("publishes a coherent V92.22 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.25"');
    expect(packageJson).toContain('"v92-22:check"');
    expect(packageJson).toContain("npm run v92-22:check");
    expect(worker).toContain("miles-meals-static-v92-25");
  });

  it("keeps one Next.js loading boundary for authenticated app routes", () => {
    expect(existsSync("src/app/loading.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/loading.tsx")).toBe(true);
    expect(appLoading).toContain("BrandedLoadingScreen");
  });

  it("shows a separate status and remaining balance for each payment", () => {
    expect(workspace).toContain("Payments by person");
    expect(workspace).toContain("Payment transactions");
    expect(workspace).toContain("Remaining after");
    expect(workspace).toContain("Partial payment confirmed");
    expect(workspace).toContain("Full payment · awaiting confirmation");
  });

  it("distinguishes confirmed, pending and unpaid money", () => {
    expect(workspace).toContain("Confirmed paid");
    expect(workspace).toContain("Confirmed received");
    expect(workspace).toContain("Awaiting confirmation");
    expect(workspace).toContain("Still to pay");
    expect(workspace).toContain("Still to receive");
  });

  it("keeps transaction cards responsive on narrow PWA screens", () => {
    expect(css).toContain(".individual-payment-card > summary");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".individual-payment-transaction-state");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});
