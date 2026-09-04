import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldAttemptRouteRecovery } from "@/lib/route-recovery";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.25 receipt scan and PWA recovery", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const expenseForm = read("src/components/ExpenseForm.tsx");
  const css = read("src/app/v92-living-journey.css");
  const navigation = read("src/components/FullPageLink.tsx");
  const mobileNav = read("src/components/MobileNav.tsx");
  const globalError = read("src/app/global-error.tsx");
  const launchDismiss = read("src/components/PwaLaunchDismiss.tsx");
  const nextConfig = read("next.config.ts");

  it("publishes one coherent V92.25 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.25"');
    expect(packageJson).toContain('"v92-25:check"');
    expect(worker).toContain("miles-meals-static-v92-25");
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

  it("fetches a fresh route on tap while keeping client navigation", () => {
    expect(navigation).toContain("prefetch = false");
    expect(navigation).toContain('data-navigation-mode="client"');
    expect(navigation).toContain("fresh-on-tap");
    expect(mobileNav).toContain("prefetch={false}");
    expect(nextConfig).toContain("deploymentId:");
    expect(nextConfig).toContain("NEXT_DEPLOYMENT_ID");
    expect(nextConfig).toContain("VERCEL_GIT_COMMIT_SHA");
    expect(navigation).not.toContain("NATIVE_NAVIGATION_FALLBACK_MS");
  });

  it("allows only one automatic document recovery per failed target", () => {
    const now = 10_000;
    expect(shouldAttemptRouteRecovery(null, "/expenses/new", now)).toBe(true);
    expect(shouldAttemptRouteRecovery(
      JSON.stringify({ target: "/expenses/new", attemptedAt: now - 500 }),
      "/expenses/new",
      now,
    )).toBe(false);
    expect(shouldAttemptRouteRecovery(
      JSON.stringify({ target: "/expenses/new", attemptedAt: now - 500 }),
      "/dashboard",
      now,
    )).toBe(true);
    expect(shouldAttemptRouteRecovery(
      JSON.stringify({ target: "/expenses/new", attemptedAt: now - 46_000 }),
      "/expenses/new",
      now,
    )).toBe(true);
  });

  it("clears recovery only after hydration and keeps one Halo boundary", () => {
    expect(globalError).toContain("beginRouteRecovery");
    expect(globalError).toContain("window.location.replace(window.location.href)");
    expect(launchDismiss).toContain("clearRouteRecovery");
    expect(existsSync("src/app/loading.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/loading.tsx")).toBe(true);
  });
});
