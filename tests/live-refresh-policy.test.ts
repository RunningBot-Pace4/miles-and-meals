import { describe, expect, it } from "vitest";
import { canRefreshPage, HOME_REFRESH_INTERVAL_MS } from "@/lib/live-refresh-policy";
import config from "../next.config";
import { readFileSync } from "node:fs";

describe("live Home updates", () => {
  const ready = { online: true, visible: true, busy: false, editing: false };
  it("updates visible idle pages on a 15-second interval", () => {
    expect(HOME_REFRESH_INTERVAL_MS).toBe(15_000);
    expect(canRefreshPage(ready)).toBe(true);
  });
  it("does not refresh the entire Home server page in the background", () => {
    const dashboard = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");
    expect(dashboard).not.toContain("PageLiveRefresh");
    expect(dashboard).toContain("LiveSettlementWorkspace");
    expect(dashboard).toContain("LiveDashboardFinance");
  });
  it.each([{ online: false }, { visible: false }, { busy: true }, { editing: true }])("defers unsafe refreshes: %o", (state) => {
    expect(canRefreshPage({ ...ready, ...state })).toBe(false);
  });
});

describe("consolidated screens", () => {
  it("redirects only standalone screens, never detail or API routes, without loops", async () => {
    const redirects = await config.redirects!();
    expect(redirects).toHaveLength(8);
    const sources = redirects.map(route => route.source);
    expect(sources).not.toContain("/expenses/:path*");
    for (const route of redirects) {
      expect(sources).not.toContain(route.destination.split("?")[0]);
      expect(route.source).not.toMatch(/^\/api\//);
      expect(route.permanent).toBe(false);
    }
    expect(redirects.find(route => route.source === "/settlements")?.destination).toBe("/spend?tab=settlements");
  });
});
