import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V92.4 web and installed-PWA layout", () => {
  const starter = read("src/components/LivingJourneyStarter.tsx");
  const halo = read("src/components/LivingJourneyHalo.tsx");
  const nav = read("src/components/MobileNav.tsx");
  const css = read("src/app/v92-living-journey.css");

  it("selects the touched Halo mode before the click completes", () => {
    expect(starter).toContain("onPointerDown={() => setActiveMode(mode)}");
    expect(halo).toContain("onPointerDown={() => setActiveMode(mode)}");
  });

  it("removes the iOS grey tap flash while retaining blue feedback", () => {
    expect(css).toContain("-webkit-tap-highlight-color: transparent");
    expect(css).toContain('button[role="tab"]:active');
    expect(css).toContain("border-color: var(--v92-blue) !important");
    expect(css).toContain("background: white !important");
  });

  it("keeps touch targets and mode transitions stable", () => {
    expect(css).toContain("min-height: 40px !important");
    expect(css).toContain("@keyframes v92-mode-panel-in");
    expect(css).toContain("animation: none !important");
  });

  it("moves bottom-navigation feedback to the newly tapped destination", () => {
    expect(nav).toContain("pendingHref");
    expect(nav).toContain("navigation-pending");
    expect(css).toContain('.mobile-nav[data-navigation-pending="true"]');
  });

  it("retains mobile safe areas and the desktop rail breakpoint", () => {
    expect(css).toContain("calc(6.7rem + env(safe-area-inset-bottom))");
    expect(css).toContain("bottom: max(0.55rem, env(safe-area-inset-bottom))");
    expect(css).toContain("@media (min-width: 1024px)");
  });
});
