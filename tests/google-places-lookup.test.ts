import { describe, expect, it, vi } from "vitest";
import { searchFreePlace } from "@/lib/free-place-lookup";
import { placeMatchConfidence } from "@/lib/google-places";
const input = { clientKey: "one", title: "Cafe", countryName: "Hong Kong", apiKey: "secret" };
describe("free place lookup", () => {
  it("only contacts Geoapify and reads coordinates", async () => {
    const fetcher = vi.fn(async (url: any) => {
      const parsed = new URL(String(url));
      expect(parsed.hostname).toBe("api.geoapify.com");
      expect(parsed.searchParams.get("text")).toBe("Cafe, Hong Kong");
      return Response.json({ results: [{ name: "Cafe", formatted: "Cafe, Hong Kong", lat: 22.3, lon: 114.2, place_id: "test", result_type: "amenity" }] });
    });
    expect(await searchFreePlace({ ...input, fetcher })).toMatchObject({ latitude: 22.3, longitude: 114.2, confidence: "MATCHED" });
  });
  it("does not turn a city-only match into a business location", async () => {
    expect(await searchFreePlace({ ...input, fetcher: async () => Response.json({ results: [{ lat: 22, lon: 114, result_type: "city" }] }) })).toBeNull();
  });
  it("returns missing results without invented coordinates", async () => {
    expect(await searchFreePlace({ ...input, fetcher: async () => Response.json({ results: [] }) })).toBeNull();
  });
  it("reports quota limits without trying a paid provider", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 429 }));
    await expect(searchFreePlace({ ...input, fetcher })).rejects.toThrow(/limit reached/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("flags different business names", () => {
    expect(placeMatchConfidence("Cafe", "Other Hotel")).toBe("CHECK");
  });
});

it("rejects a country-named business as the result of a detailed address", async () => {
  expect(await searchFreePlace({ ...input, title: "6-8 Kings Road", fetcher: async () => Response.json({ results: [{ name: "Hong Kong", lat: 22.28, lon: 114.15, result_type: "amenity" }] }) })).toBeNull();
});
