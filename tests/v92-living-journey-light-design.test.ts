import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V92 approved Living Journey light design", () => {
  const css = read("src/app/v92-living-journey.css");
  const layout = read("src/app/layout.tsx");
  const halo = read("src/components/LivingJourneyHalo.tsx");
  const manifest = JSON.parse(read("public/manifest-v92.webmanifest")) as {
    theme_color: string;
    background_color: string;
    icons: Array<{ src: string; purpose: string }>;
  };

  it("loads the light V92 design after all legacy styles", () => {
    expect(layout.indexOf('import "@/app/v92-living-journey.css"')).toBeGreaterThan(
      layout.indexOf('import "@/app/living-journey.css"'),
    );
    expect(css).toContain("color-scheme: light");
    expect(css).not.toContain("#061c33");
  });

  it("renders the recognizable four-segment data Halo", () => {
    for (const color of ["#3d82f6", "#f5d98b", "#edb18d", "#9bd0a5"]) {
      expect(css).toContain(color);
    }
    for (const mode of ["Move", "Plan", "Spend", "People"]) {
      expect(halo).toContain(mode);
    }
    expect(halo).toContain("active.title");
    expect(halo).toContain('role="tablist"');
  });

  it("covers compact mobile and desktop navigation layouts", () => {
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (max-width: 360px)");
    expect(css).toContain(".mobile-nav");
    expect(css).toContain(".page-container");
  });

  it("ships a fully versioned light PWA identity", () => {
    expect(manifest.theme_color).toBe("#ffffff");
    expect(manifest.background_color).toBe("#f7f8fa");
    expect(manifest.icons.every((icon) => icon.src.startsWith("/icons/v92/"))).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
