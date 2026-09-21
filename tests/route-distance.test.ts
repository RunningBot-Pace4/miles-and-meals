import { afterEach, describe, expect, it, vi } from "vitest";
import { routeDistance } from "../src/lib/route-distance";
const start = { latitude: 22.28, longitude: 114.19 };
const end = { latitude: 22.30, longitude: 114.17 };
afterEach(() => vi.unstubAllGlobals());
describe("walking and driving route distance", () => {
  it.each(["walk", "drive"] as const)("requests %s routes and converts meters and seconds", async mode => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [{ distance: 2450, distance_units: "meters", time: 1501 }] }));
    vi.stubGlobal("fetch", fetcher);
    expect(await routeDistance(start, end, mode, "test-key")).toEqual({ km: 2.45, minutes: 26 });
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("mode")).toBe(mode);
    expect(url.searchParams.get("waypoints")).toBe("22.28,114.19|22.3,114.17");
    expect(url.searchParams.get("units")).toBe("metric");
  });
  it("does not substitute straight-line distance for a missing route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ results: [] })));
    expect(await routeDistance(start, end, "walk", "key")).toBeNull();
  });
  it("accepts metric responses that omit a unit label", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ results: [{ distance: 1250, time: 600 }] })));
    expect(await routeDistance(start, end, "walk", "key")).toEqual({ km: 1.25, minutes: 10 });
  });
  it("rejects invalid units rather than displaying miles as kilometers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ results: [{ distance: 5, distance_units: "Miles", time: 100 }] })));
    await expect(routeDistance(start, end, "drive", "key")).rejects.toThrow("invalid distance");
  });
  it("reports provider quota errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));
    await expect(routeDistance(start, end, "walk", "key")).rejects.toThrow("allowance");
  });
});
