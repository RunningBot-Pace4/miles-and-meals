import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ loggedIn: true, access: true, country: true, calls: [] as any[] }));
vi.mock("@/lib/session", () => ({ getSession: async () => state.loggedIn ? { user: { id: "user" } } : null }));
vi.mock("@/lib/access", () => ({ canAccessCountry: async () => state.access, getCountryWithTrip: async () => state.country ? ({ countryName: "Hong Kong" }) : null }));
vi.mock("@/lib/free-place-lookup", async (original) => {
  const actual = await original<typeof import("@/lib/free-place-lookup")>();
  const resolve = async (input: any) => { state.calls.push(input); return input.title === "Missing" ? null : { clientKey: input.clientKey, title: input.title, matchedName: input.title, formattedAddress: "HK", googleMapsUri: "https://maps.google.com/?cid=1", placeId: input.placeId ?? "id", latitude: 22.3, longitude: 114.2, confidence: "MATCHED" }; };
  return { ...actual, searchFreePlace: resolve };
});
import { POST } from "@/app/api/travel-items/resolve-places/route";
const countryId = "10000000-0000-4000-8000-000000000001";
const call = (places: Array<{ clientKey: string; title: string; placeId?: string }> = [{ clientKey: "a", title: "Cafe" }], origin = "https://app.test") => POST(new Request("https://app.test/api/travel-items/resolve-places", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ countryId, places }) }));
beforeEach(() => { Object.assign(state, { loggedIn: true, access: true, country: true, calls: [] }); process.env.GEOAPIFY_API_KEY = "secret"; });

describe("Google location resolver API", () => {
  it("uses the trip country and hides the API key from its response", async () => {
    const response = await call([{ clientKey: "a", title: "Cafe" }, { clientKey: "b", title: "Missing" }]);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ missing: 1, matches: [{ clientKey: "a" }] });
    expect(state.calls[0]).toMatchObject({ countryName: "Hong Kong", apiKey: "secret" });
    expect(JSON.stringify(await (await call()).json())).not.toContain("secret");
  });
  it("resolves legacy saved stays through the free provider", async () => {
    const response = await call([{ clientKey: "stay", title: "Hotel", placeId: "ChIJ_hotel" }]);
    expect(response.status).toBe(200);
    expect(state.calls[0]).toMatchObject({ placeId: "ChIJ_hotel", apiKey: "secret" });
  });
  it("rejects unauthenticated, unauthorized, cross-site and oversized requests", async () => {
    state.loggedIn = false; expect((await call()).status).toBe(401);
    state.loggedIn = true; state.access = false; expect((await call()).status).toBe(403);
    state.access = true; expect((await call(undefined, "https://evil.test")).status).toBe(403);
    expect((await call(Array.from({ length: 26 }, (_, index) => ({ clientKey: String(index), title: "Cafe" })))).status).toBe(400);
  });
  it("reports missing server configuration before billing any lookup", async () => {
    delete process.env.GEOAPIFY_API_KEY;
    expect((await call()).status).toBe(503);
    expect(state.calls).toHaveLength(0);
  });
});
