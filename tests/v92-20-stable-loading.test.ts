import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("V92.20 stable Web and PWA loading", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const loading = read("src/components/BrandedLoadingScreen.tsx");
  const layout = read("src/app/layout.tsx");
  const dismiss = read("src/components/PwaLaunchDismiss.tsx");
  const saving = read("src/components/SavingOverlay.tsx");
  const css = read("src/app/v92-living-journey.css");

  it("publishes a coherent V92.20 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.25"');
    expect(packageJson).toContain('"v92-20:check"');
    expect(packageJson).toContain("npm run v92-20:check");
    expect(worker).toContain("miles-meals-static-v92-25");
  });

  it("retains the branded PWA launch artwork", () => {
    expect(layout).toContain('className="pwa-launch-art"');
    expect(layout).toContain("v92-loading-halo");
    expect(layout).toContain("Getting your trip ready");
  });

  it("keeps loading surfaces fitted to stable viewport geometry", () => {
    expect(css).toContain("height: 100svh");
    expect(css).toContain("contain: layout");
    expect(css).toContain("backdrop-filter: none");
  });

  it("delays only transient route loading while actions remain immediate", () => {
    expect(loading).toContain('const loadingKind = showCopy ? "action" : "route"');
    expect(css).toContain(".trip-loading-route-overlay");
    expect(css).toContain("animation: v92-route-loader-reveal 100ms ease-out 140ms forwards");
    expect(css).toContain(".trip-loading-action-overlay");
    expect(css).toContain("backdrop-filter: none");
  });

  it("dismisses the cold splash after hydration without a second load wait", () => {
    expect(dismiss).toContain("const MINIMUM_SPLASH_MS = 240");
    expect(dismiss).toContain("const elapsed = performance.now()");
    expect(dismiss).toContain("window.requestAnimationFrame(dismiss)");
    expect(dismiss).not.toContain('window.addEventListener("load"');
  });

  it("keeps desktop content fixed while an action overlay locks scrolling", () => {
    expect(saving).toContain("window.innerWidth - document.documentElement.clientWidth");
    expect(saving).toContain("previousBodyPaddingRight");
    expect(saving).toContain("document.body.style.paddingRight");
  });
});
