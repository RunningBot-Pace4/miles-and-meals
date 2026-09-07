import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.27 installed-PWA navigation reliability", () => {
  const packageJson = read("package.json");
  const navigation = read("src/components/FullPageLink.tsx");
  const cleanup = read("scripts/cleanup-legacy-files.mjs");
  const worker = read("public/sw.js");

  it("publishes a coherent V92.27 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.27"');
    expect(packageJson).toContain('"v92-27:check"');
    expect(worker).toContain("miles-meals-static-v92-27");
  });

  it("keeps fast client navigation for the normal web app", () => {
    expect(navigation).toContain('from "next/link"');
    expect(navigation).toContain('data-navigation-mode="client"');
    expect(navigation).toContain("prefetch = null");
  });

  it("uses one immediate document request in an installed PWA", () => {
    expect(navigation).toContain("isInstalledPwa");
    expect(navigation).toContain('data-pwa-navigation-mode="document"');
    expect(navigation).toContain("event.preventDefault()");
    expect(navigation).toContain("window.location.href = targetUrl.href");
    expect(navigation).not.toContain("setTimeout");
    expect(navigation).not.toContain("NATIVE_NAVIGATION_FALLBACK_MS");
  });

  it("cleans every build-breaking nested-project root", () => {
    for (const path of [
      "src/lib/src",
      "src/lib/tests",
      "src/lib/scripts",
      "src/lib/public",
      "src/lib/e2e",
      "src/lib/package.json",
      "src/lib/next.config.ts",
    ]) {
      expect(cleanup).toContain(`"${path}"`);
      expect(existsSync(path)).toBe(false);
    }
  });
});
