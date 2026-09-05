import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.26 Vercel-managed navigation", () => {
  const packageJson = read("package.json");
  const nextConfig = read("next.config.ts");
  const navigation = read("src/components/FullPageLink.tsx");
  const mobileNav = read("src/components/MobileNav.tsx");
  const appError = read("src/app/error.tsx");
  const globalError = read("src/app/global-error.tsx");
  const worker = read("public/sw.js");
  const legacyCleanup = read("scripts/cleanup-legacy-files.mjs");

  it("publishes a coherent V92.26 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.26"');
    expect(packageJson).toContain('"v92-26:check"');
    expect(worker).toContain("miles-meals-static-v92-26");
  });

  it("does not override Vercel's source-build skew protection", () => {
    expect(nextConfig).not.toContain("deploymentId:");
    expect(nextConfig).not.toContain("NEXT_DEPLOYMENT_ID");
    expect(nextConfig).not.toContain("VERCEL_DEPLOYMENT_ID");
    expect(nextConfig).not.toContain("VERCEL_GIT_COMMIT_SHA");
  });

  it("uses one prefetched Next.js request per normal page tap", () => {
    expect(navigation).toContain("prefetch = null");
    expect(navigation).toContain('data-navigation-mode="client"');
    expect(navigation).toContain("adaptive");
    expect(navigation).not.toContain("window.location");
    expect(mobileNav).toContain("prefetch");
  });

  it("does not automatically reload after a route error", () => {
    for (const source of [appError, globalError]) {
      expect(source).not.toContain("beginRouteRecovery");
      expect(source).not.toContain("window.location.replace(window.location.href)");
      expect(source).not.toContain("setTimeout");
    }

    expect(existsSync("src/lib/route-recovery.ts")).toBe(false);
    expect(legacyCleanup).toContain('"src/lib/route-recovery.ts"');
    expect(legacyCleanup).toContain(
      '"tests/v92-25-1-deployment-id.test.ts"',
    );
    expect(legacyCleanup).toContain('"scripts/validate-v92-25-1.mjs"');
  });

  it("keeps the rotating Halo and one authenticated loading boundary", () => {
    const loader = read("src/components/BrandedLoadingScreen.tsx");
    expect(loader).toContain("v92-loading-halo");
    expect(existsSync("src/app/loading.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/loading.tsx")).toBe(true);
  });
});
