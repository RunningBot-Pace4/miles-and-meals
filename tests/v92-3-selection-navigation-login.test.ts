import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V92.3 mobile selection and transition reliability", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const links = read("src/components/FullPageLink.tsx");
  const css = read("src/app/v92-living-journey.css");
  const login = read("src/components/LoginForm.tsx");

  it("uses Node 24 and a new coherent PWA cache", () => {
    expect(packageJson).toContain('"version": "1.92.21"');
    expect(packageJson).toContain('"node": "24.x"');
    expect(worker).toContain("miles-meals-static-v92-21");
  });

  it("keeps authenticated navigation on one reliable document request", () => {
    expect(links).toContain("<a");
    expect(links).toContain('data-navigation-mode="document"');
    expect(links).toContain("data-navigation-pending");
    expect(links).toContain("createPortal(<BrandedLoadingScreen />");
    expect(links).not.toContain("NATIVE_NAVIGATION_FALLBACK_MS");
  });

  it("shows selection with blue outlines only", () => {
    expect(css).toContain('button[role="tab"][aria-selected="true"]');
    expect(css).toContain('border-color: var(--v92-blue) !important');
    expect(css).toContain('.menu-row.link-row[data-navigation-pending="true"]');
    expect(css).toContain('content: none !important');
  });

  it("uses one login transition state", () => {
    expect(login).toContain('aria-busy={busy}');
    expect(login).toContain('busy ? "Signing in…"');
    expect(login).not.toContain("SavingOverlay");
  });
});
