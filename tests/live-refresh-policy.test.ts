import { describe, expect, it } from "vitest";
import { canRefreshPage, SAVED_PAGE_REFRESH_DELAY_MS } from "@/lib/live-refresh-policy";
import config from "../next.config";
import { readFileSync } from "node:fs";

describe("safe live page updates", () => {
  const ready = { online: true, visible: true, busy: false, editing: false };
  it("refreshes server pages shortly after a confirmed save", () => {
    expect(SAVED_PAGE_REFRESH_DELAY_MS).toBe(150);
    expect(canRefreshPage(ready)).toBe(true);
  });
  it("never refreshes the whole server page from an idle timer, focus or online event", () => {
    const refresher = readFileSync("src/components/PageLiveRefresh.tsx", "utf8");
    expect(refresher).not.toContain("setInterval");
    expect(refresher).not.toContain('"focus"');
    expect(refresher).not.toContain('"online"');
    expect(refresher).not.toContain("visibilitychange");
    expect(refresher).toContain("event.detail?.saved === true");
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
