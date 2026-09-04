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
  const stableRules = css.slice(
    css.indexOf(".v92-loading-halo {"),
    css.indexOf("/* V92.3 · quiet blue selection"),
  );

  it("publishes a coherent V92.20 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.20"');
    expect(packageJson).toContain('"v92-20:check"');
    expect(packageJson).toContain("npm run v92-20:check");
    expect(worker).toContain("miles-meals-static-v92-20");
  });

  it("uses one visual shell for cold PWA startup and route loading", () => {
    expect(layout).toContain("trip-loading-card trip-loading-route-card pwa-launch-card");
    expect(layout).toContain('className="trip-loading-brand"');
    expect(layout).toContain('className="trip-loading-foot"');
    expect(layout).not.toContain('className="pwa-launch-art"');
  });

  it("keeps the Halo geometry fixed", () => {
    expect(stableRules).not.toContain("rotate(");
    expect(stableRules).not.toContain("scale(");
    expect(stableRules).not.toContain("translateX(");
    expect(stableRules).toContain("animation: none");
    expect(css).toContain("@keyframes v92-loader-opacity");
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
