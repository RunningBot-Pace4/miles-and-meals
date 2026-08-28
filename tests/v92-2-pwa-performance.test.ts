import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V92.2 PWA reliability and performance", () => {
  const worker = read("public/sw.js");
  const updater = read("src/components/PwaRegister.tsx");
  const link = read("src/components/FullPageLink.tsx");
  const navigationGate = read("scripts/validate-navigation.mjs");
  const css = read("src/app/v92-living-journey.css");
  const health = read("src/app/(app)/admin/health/page.tsx");
  const login = read("src/components/LoginForm.tsx");

  it("has one controlled update path with timeout, retry and reload recovery", () => {
    const installBlock = worker.slice(
      worker.indexOf('self.addEventListener("install"'),
      worker.indexOf('self.addEventListener("activate"'),
    );
    expect(installBlock).not.toContain("self.skipWaiting(");
    expect(worker).toContain('miles-meals-static-v92-6');
    expect(updater).toContain("waitForWaitingWorker");
    expect(updater).toContain("UPDATE_RELOAD_TIMEOUT_MS");
    expect(updater).toContain('"Retry"');
  });

  it("uses reliable native navigation and exposes the selected row while opening", () => {
    expect(link).toContain("href={href}");
    expect(link).toContain("data-navigation-pending");
    expect(link).not.toContain("NextLink");
    expect(navigationGate).not.toContain('relativePath === "src/components/FullPageLink.tsx"');
  });

  it("makes selected tabs and main destinations unmistakable", () => {
    expect(css).toContain('button[role="tab"][aria-selected="true"]');
    expect(css).toContain('content: none !important');
    expect(css).toContain('.nav-item[aria-current="page"]');
  });

  it("separates missing-table errors from temporary health-check failures", () => {
    expect(health).toContain("42P01");
    expect(health).toContain("Required app tables");
    expect(health).not.toContain("before releasing V90");
  });

  it("remembers only the email and delegates passwords to the device manager", () => {
    expect(login).toContain("mnm:remembered-login-email");
    expect(login).toContain("rememberMe: rememberLogin");
    expect(login).toContain('autoComplete="current-password"');
    expect(login).not.toMatch(/localStorage\.(setItem|getItem)\([^\n]*password/i);
  });
});
