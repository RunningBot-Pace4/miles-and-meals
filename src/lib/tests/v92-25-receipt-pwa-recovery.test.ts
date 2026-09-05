import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.25 receipt scan and PWA recovery", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const expenseForm = read("src/components/ExpenseForm.tsx");
  const css = read("src/app/v92-living-journey.css");
  const navigation = read("src/components/FullPageLink.tsx");
  const mobileNav = read("src/components/MobileNav.tsx");
  const appError = read("src/app/error.tsx");
  const globalError = read("src/app/global-error.tsx");
  const launchDismiss = read("src/components/PwaLaunchDismiss.tsx");
  const nextConfig = read("next.config.ts");

  it("publishes one coherent V92.25 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.26"');
    expect(packageJson).toContain('"v92-25:check"');
    expect(worker).toContain("miles-meals-static-v92-26");
  });

  it("removes receipt-item splitting without deleting untouched historical itemization", () => {
    expect(expenseForm).not.toContain("Split by receipt items");
    expect(expenseForm).not.toContain("Apply itemized split");
    expect(expenseForm).not.toContain("applyReceiptItemizedSplit");
    expect(expenseForm).not.toContain("setReceiptItems");
    expect(expenseForm).toContain("preserveInitialItemization");
    expect(expenseForm).toContain("initial.itemization");
  });

  it("contains the receipt canvas and pins the phone navigation above it", () => {
    expect(css).toContain("V92.25 · receipt scan PWA containment");
    expect(css).toContain("body:has(.expense-editor)");
    expect(css).toContain("touch-action: pan-y");
    expect(css).toContain("contain: inline-size");
    expect(css).toContain('body > .mobile-nav[data-app-mobile-nav="true"]');
    expect(css).toContain("z-index: 10000 !important");
    expect(css).toContain("visibility: visible !important");
  });

  it("uses one platform-managed client navigation with safe prefetching", () => {
    expect(navigation).toContain("prefetch = null");
    expect(navigation).toContain('data-navigation-mode="client"');
    expect(navigation).toContain("adaptive");
    expect(mobileNav).toContain("prefetch");
    expect(nextConfig).not.toContain("deploymentId:");
    expect(nextConfig).not.toContain("VERCEL_GIT_COMMIT_SHA");
    expect(navigation).not.toContain("NATIVE_NAVIGATION_FALLBACK_MS");
  });

  it("never auto-reloads an error and keeps one Halo boundary", () => {
    expect(appError).not.toContain("beginRouteRecovery");
    expect(globalError).not.toContain("beginRouteRecovery");
    expect(globalError).not.toContain("window.location.replace(window.location.href)");
    expect(launchDismiss).not.toContain("clearRouteRecovery");
    expect(existsSync("src/lib/route-recovery.ts")).toBe(false);
    expect(existsSync("src/app/loading.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/loading.tsx")).toBe(true);
  });
});
