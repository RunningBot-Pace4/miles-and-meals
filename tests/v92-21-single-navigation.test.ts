import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("V92.21 single navigation and restored Halo", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const navigation = read("src/components/FullPageLink.tsx");
  const navigationGate = read("scripts/validate-navigation.mjs");
  const css = read("src/app/v92-living-journey.css");
  const layout = read("src/app/layout.tsx");
  const globalError = read("src/app/global-error.tsx");

  it("publishes one coherent V92.21 PWA version", () => {
    expect(packageJson).toContain('"version": "1.92.26"');
    expect(packageJson).toContain('"v92-21:check"');
    expect(packageJson).toContain("npm run v92-21:check");
    expect(worker).toContain("miles-meals-static-v92-26");
  });

  it("uses one fresh client transition for every shared route link", () => {
    expect(navigation).toContain('from "next/link"');
    expect(navigation).toContain("<NextLink");
    expect(navigation).toContain('data-navigation-mode="client"');
    expect(navigation).toContain("prefetch = null");
    expect(navigation).not.toContain("NATIVE_NAVIGATION_FALLBACK_MS");
    expect(navigation).not.toContain("window.location.assign(targetUrl.href)");
    expect(navigation).not.toContain('data-navigation-mode="document"');
  });

  it("leaves loading to the single route boundary", () => {
    expect(navigation).not.toContain("createPortal(<BrandedLoadingScreen />");
    expect(navigation).not.toContain("NAVIGATION_INDICATOR_TIMEOUT_MS");
  });

  it("restores the approved rotating Halo motion", () => {
    expect(css).toContain("animation: v92-halo-breathe 1.8s ease-in-out infinite");
    expect(css).toContain("@keyframes v92-halo-breathe");
    expect(css).toContain("rotate(-3deg) scale(0.98)");
    expect(css).toContain("@keyframes v92-route-progress");
    expect(layout).toContain('className="pwa-launch-art"');
  });

  it("allows Next Link only inside the shared wrapper", () => {
    expect(navigationGate).toContain("sharedLinkPath");
    expect(navigationGate).toContain('from "next/link"');
  });

  it("keeps a truthful fallback for genuine non-navigation failures", () => {
    expect(globalError).toContain("This page couldn&apos;t open");
    expect(globalError).toContain("page request stopped unexpectedly");
    expect(globalError).not.toContain("client-side");
    expect(globalError).not.toContain("page transition");
  });
});
