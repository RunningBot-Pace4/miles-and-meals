import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("V91.1 release recovery", () => {
  it("clears stale generated route types before typecheck and clean builds", () => {
    const packageJson = read("package.json");
    const cleanup = read("scripts/cleanup-next-cache.mjs");

    expect(packageJson).toContain("npm run cleanup:next-types && tsc --noEmit");
    expect(packageJson).toContain("npm run cleanup:next && npm run cleanup:legacy");
    expect(cleanup).toContain('".next/types"');
    expect(cleanup).toContain('".next/dev/types"');
  });

  it("loads Living Journey last with explicit desktop and mobile geometry", () => {
    const layout = read("src/app/layout.tsx");
    const css = read("src/app/living-journey.css");

    expect(layout.indexOf('import "@/app/living-journey.css"')).toBeGreaterThan(
      layout.indexOf('import "@/app/globals.css"'),
    );
    expect(css).toContain("v91.1 final cascade recovery");
    expect(css).toContain('"main mark"');
    expect(css).toContain("max-width: 430px");
    expect(css).toContain("max-width: 360px");
  });

  it("uses immutable V91.1 PWA icon paths", () => {
    const layout = read("src/app/layout.tsx");
    const manifest = read("public/manifest-v91-1.webmanifest");
    const worker = read("public/sw.js");

    expect(layout).toContain("/manifest-v91-1.webmanifest");
    expect(manifest).toContain("/icons/v91-1/icon-192.png");
    expect(worker).toContain("miles-meals-static-v91-2");
    expect(worker).toContain("/icons/v91-1/notification-icon-96.png");
  });
});
