import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  loggedIn: true, access: true, edit: true, results: [] as unknown[][],
  saved: [] as unknown[], removed: 0,
  provider: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getSession: async () => state.loggedIn ? { user: { id: "me" } } : null }));
vi.mock("@/lib/access", () => ({ canAccessCountry: async () => state.access, getCountryWithTrip: async () => ({ tripId: "trip" }) }));
vi.mock("@/lib/trip-capabilities", () => ({ getTripCapabilities: async () => ({ canEditPlan: state.edit }) }));
vi.mock("@/lib/route-distance", () => ({ routeDistance: state.provider }));
vi.mock("@/db", () => ({ db: {
  select: () => ({ from: () => ({ where: () => { const rows = state.results.shift() ?? []; return Object.assign(Promise.resolve(rows), { limit: async () => rows }); } }) }),
  insert: () => ({ values: (value: unknown) => ({ onConflictDoUpdate: async () => { state.saved.push(value); } }) }),
  delete: () => ({ where: async () => { state.removed++; } }),
} }));
import { GET, POST } from "../src/app/api/travel-items/route-distance/route";
import { routePinKey } from "../src/lib/saved-route";
const countryId = "10000000-0000-4000-8000-000000000001";
const stayId = "10000000-0000-4000-8000-000000000002";
const placeId = "10000000-0000-4000-8000-000000000003";
const start = { latitude: 22.28, longitude: 114.19 }, end = { latitude: 22.3, longitude: 114.17 };
const items = [
  { id: stayId, countryId, subtype: "Accommodation", itemType: "ITINERARY", linkUrl: "https://maps.google.com/?q=22.28,114.19", notes: null },
  { id: placeId, countryId, subtype: null, itemType: "PLACE", linkUrl: "https://maps.google.com/?q=22.3,114.17", notes: null },
];
const get = () => GET(new Request("https://app.test/api/travel-items/route-distance?countryId=" + countryId + "&mode=walk"));
const post = (origin = "https://app.test") => POST(new Request("https://app.test/api/travel-items/route-distance", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ countryId, stayId, placeId, mode: "walk", start: { latitude: 0, longitude: 0 } }) }));
beforeEach(() => { Object.assign(state, { loggedIn: true, access: true, edit: true, results: [], saved: [], removed: 0 }); state.provider.mockReset().mockResolvedValue({ km: 2.5, minutes: 30 }); vi.stubEnv("GEOAPIFY_API_KEY", "test-key"); });
describe("shared route API", () => {
  it("reads valid shared results without calculating, filtering stale pins", async () => {
    const route = { countryId, stayId, placeId, pinKey: routePinKey(start, end, "walk"), km: 2.5, minutes: 30 };
    state.results = [[route, { ...route, pinKey: "old" }], items];
    expect(await (await get()).json()).toEqual({ routes: [route] });
    expect(state.provider).not.toHaveBeenCalled();
  });
  it("rejects missing authentication, access and cross-site mutations", async () => {
    state.loggedIn = false; expect((await get()).status).toBe(401);
    state.loggedIn = true; state.access = false; expect((await get()).status).toBe(403);
    expect((await post("https://evil.test")).status).toBe(403);
    expect(state.provider).not.toHaveBeenCalled();
  });
  it("blocks recalculation for closed trips and viewers", async () => {
    state.edit = false; expect((await post()).status).toBe(403);
    state.edit = true; state.results = [[{ status: "CLOSED" }]];
    expect((await post()).status).toBe(409);
    expect(state.provider).not.toHaveBeenCalled();
  });
  it("calculates using database pins, ignoring caller coordinates, and saves the result", async () => {
    state.results = [[{ status: "OPEN" }], items];
    expect((await post()).status).toBe(200);
    expect(state.provider).toHaveBeenCalledWith(start, end, "walk", "test-key", true);
    expect(state.saved[0]).toMatchObject({ countryId, stayId, placeId, km: 2.5, minutes: 30, pinKey: routePinKey(start, end, "walk") });
  });
  it("removes obsolete saved results if the provider reports no route", async () => {
    state.results = [[{ status: "OPEN" }], items]; state.provider.mockResolvedValue(null);
    expect(await (await post()).json()).toEqual({ route: null });
    expect(state.removed).toBe(1);
  });
});
