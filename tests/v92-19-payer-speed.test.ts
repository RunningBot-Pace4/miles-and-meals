import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("V92.19 payer layout and speed", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const form = read("src/components/ExpenseForm.tsx");
  const navigation = read("src/components/FullPageLink.tsx");
  const mobileNav = read("src/components/MobileNav.tsx");
  const css = read("src/app/v92-living-journey.css");
  const livingJourneyCss = read("src/app/living-journey.css");
  const geometry = read("e2e/v92-19-payer-layout.spec.ts");

  it("publishes a coherent PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.24"');
    expect(packageJson).toContain('"v92-19:check"');
    expect(packageJson).toContain("npm run v92-19:check");
    expect(worker).toContain("miles-meals-static-v92-24");
  });

  it("uses one compact row language for one and multiple payers", () => {
    expect(form).toContain('className="single-payer-list"');
    expect(form).toContain("payer-choice-row selected");
    expect(form).toContain('className="payer-amount-input"');
    expect(css).toContain("/* V92.19 · unified payer rows");
    expect(css).toContain(".payer-choice-row.selected");
    expect(css).toContain(".payer-amount-input > span");
    expect(css).toContain("grid-template-columns: auto minmax(0, 1fr) !important");
  });

  it("keeps payer and split controls fitted on phones", () => {
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr)) !important");
    expect(css).toContain("grid-template-columns: repeat(4, minmax(0, 1fr)) !important");
    expect(css).toContain("@media (max-width: 360px)");
    expect(geometry).toContain("320, 360, 390, 430, 600, 719");
  });

  it("does not load optional saved groups until they are opened", () => {
    expect(form).toContain("splitPresetsRequested");
    expect(form).toContain("!splitPresetsRequested");
    expect(form).toContain("if (event.currentTarget.open) setSplitPresetsRequested(true)");
  });

  it("uses one prefetched client transition and the shared Halo boundary", () => {
    expect(navigation).toContain('from "next/link"');
    expect(navigation).toContain("<NextLink");
    expect(navigation).toContain('data-navigation-mode="client"');
    expect(navigation).toContain("prefetch = null");
    expect(navigation).not.toContain("createPortal(<BrandedLoadingScreen />");
    expect(navigation).not.toContain("NATIVE_NAVIGATION_FALLBACK_MS");
    expect(mobileNav).toContain("prefetch");
  });

  it("removes the duplicated base design payload", () => {
    expect(livingJourneyCss).toContain("shared v91 base rules live in globals.css");
    expect(Buffer.byteLength(livingJourneyCss, "utf8")).toBeLessThan(8_000);
  });
});
