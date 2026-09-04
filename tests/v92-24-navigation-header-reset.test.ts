import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V92.24 fast navigation, Home header and Neon reset", () => {
  const packageJson = read("package.json");
  const worker = read("public/sw.js");
  const navigation = read("src/components/FullPageLink.tsx");
  const appLoading = read("src/app/(app)/loading.tsx");
  const dashboard = read("src/app/(app)/dashboard/page.tsx");
  const css = read("src/app/v92-living-journey.css");
  const resetSql = read("neon-reset-all-data-keep-logins-v92-24.sql");
  const schema = read("src/db/schema.ts");

  it("publishes one coherent V92.24 PWA release", () => {
    expect(packageJson).toContain('"version": "1.92.25"');
    expect(packageJson).toContain('"v92-24:check"');
    expect(packageJson).toContain("npm run v92-24:check");
    expect(worker).toContain("miles-meals-static-v92-25");
  });

  it("keeps the app shell mounted during prefetched page transitions", () => {
    expect(navigation).toContain('from "next/link"');
    expect(navigation).toContain("<NextLink");
    expect(navigation).toContain('data-navigation-mode="client"');
    expect(navigation).toContain("prefetch = false");
    expect(navigation).not.toContain('data-navigation-mode="document"');
    expect(navigation).not.toContain("createPortal(<BrandedLoadingScreen />");
    expect(navigation).not.toContain("NAVIGATION_INDICATOR_TIMEOUT_MS");
  });

  it("uses only the authenticated rotating Halo loading boundary", () => {
    expect(existsSync("src/app/loading.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/loading.tsx")).toBe(true);
    expect(appLoading).toContain("BrandedLoadingScreen");
  });

  it("turns the Home greeting into a useful responsive journey header", () => {
    expect(dashboard).toContain('className="journey-greeting-route-art"');
    expect(dashboard).toContain('className="journey-greeting-status"');
    expect(dashboard).toContain('className="journey-greeting-footer"');
    expect(dashboard).toContain("Travel dates");
    expect(dashboard).toContain("Destination");
    expect(css).toContain(".journey-greeting-route-art");
    expect(css).toContain(".journey-greeting-details");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("@media (max-width: 360px)");
  });

  it("clears every application table and excludes all login tables", () => {
    const truncateSource = resetSql
      .slice(resetSql.indexOf("TRUNCATE TABLE") + "TRUNCATE TABLE".length)
      .split("RESTART IDENTITY;")[0]
      .replace(/^\s*--.*$/gm, "");
    const resetTables = new Set(
      truncateSource
        .split(",")
        .map((value) => value.trim().replaceAll('"', ""))
        .filter(Boolean),
    );
    const preserved = new Set([
      "user",
      "account",
      "session",
      "verification",
      "user_preferences",
    ]);
    const schemaTables = [
      ...schema.matchAll(/pgTable\(\s*"([^"]+)"/g),
    ].map((match) => match[1]);

    expect([...preserved].filter((table) => resetTables.has(table))).toEqual([]);
    expect(
      schemaTables.filter(
        (table) => !preserved.has(table) && !resetTables.has(table),
      ),
    ).toEqual([]);
    expect(resetSql).toContain("_mnm_login_counts");
    expect(resetSql).toContain("Reset verification failed");
    expect(truncateSource).not.toContain("CASCADE");
  });
});
