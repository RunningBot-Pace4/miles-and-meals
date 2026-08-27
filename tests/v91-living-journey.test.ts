import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V91 Living Journey", () => {
  const halo = read("src/components/LivingJourneyHalo.tsx");
  const css = read("src/app/globals.css");
  const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
    icons: Array<{ sizes: string; purpose: string }>;
  };

  it("connects Move, Plan, Spend and People to real app destinations", () => {
    for (const mode of ["Move", "Plan", "Spend", "People"]) expect(halo).toContain(mode);
    for (const route of ["/location", "/planner", "/expenses/new", "/settlements", "/notifications"]) {
      expect(halo).toContain(route);
    }
  });

  it("preserves no horizontal overflow design evidence at 320, 360, 390 and 430 pixels", () => {
    for (const width of [320, 360, 390, 430]) {
      expect(css).toContain(width <= 360 ? "max-width: 360px" : "max-width: 430px");
    }
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("ships separate standard and maskable PWA artwork", () => {
    expect(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any")).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any")).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "maskable")).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true);
  });
});
