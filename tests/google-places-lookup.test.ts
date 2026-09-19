import { describe, expect, it, vi } from "vitest";
import { getGooglePlace, googlePlaceId, mapWithConcurrency, placeMatchConfidence, searchGooglePlace } from "@/lib/google-places";

describe("official Google Places lookup", () => {
  it("requests only the fields needed for location review and distance", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        "X-Goog-Api-Key": "server-secret",
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location",
      });
      expect(JSON.parse(String(init?.body))).toEqual({ textQuery: "Blue Bottle Coffee Wan Chai, Hong Kong", pageSize: 3 });
      return new Response(JSON.stringify({ places: [{
        id: "ChIJ-blue", displayName: { text: "Blue Bottle Coffee Wan Chai" },
        formattedAddress: "15 St Francis St, Wan Chai", googleMapsUri: "https://maps.google.com/?cid=99",
        location: { latitude: 22.276, longitude: 114.17 },
      }] }));
    });
    await expect(searchGooglePlace({ clientKey: "row-1", title: "Blue Bottle Coffee Wan Chai", countryName: "Hong Kong", apiKey: "server-secret", fetcher: fetcher as typeof fetch })).resolves.toMatchObject({
      clientKey: "row-1", placeId: "ChIJ-blue", latitude: 22.276, confidence: "MATCHED",
    });
  });
  it("returns null for no located result and surfaces provider failures", async () => {
    await expect(searchGooglePlace({ clientKey: "x", title: "Missing", countryName: "Hong Kong", apiKey: "k", fetcher: (async () => new Response('{"places":[]}')) as typeof fetch })).resolves.toBeNull();
    await expect(searchGooglePlace({ clientKey: "x", title: "Fail", countryName: "Hong Kong", apiKey: "k", fetcher: (async () => new Response("denied", { status: 403 })) as typeof fetch })).rejects.toThrow(/403/);
  });
  it("refreshes a stored Place ID without persisting provider coordinates", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain("/v1/places/ChIJ_hotel");
      return new Response(JSON.stringify({ id: "ChIJ_hotel", displayName: { text: "The Hotel" }, formattedAddress: "Hong Kong", googleMapsUri: "https://maps.google.com/?cid=3", location: { latitude: 22.28, longitude: 114.15 } }));
    });
    await expect(getGooglePlace({ clientKey: "stay", title: "The Hotel", placeId: "ChIJ_hotel", apiKey: "key", fetcher: fetcher as typeof fetch })).resolves.toMatchObject({ placeId: "ChIJ_hotel", latitude: 22.28 });
    expect(googlePlaceId("My note\nGoogle Place ID: ChIJ_hotel")).toBe("ChIJ_hotel");
    expect(googlePlaceId("Coordinates: 1, 2")).toBeNull();
  });
  it("flags weak title matches for review", () => {
    expect(placeMatchConfidence("Kai Kai Dessert", "Kai Kai Dessert")).toBe("MATCHED");
    expect(placeMatchConfidence("Temple Street Night Market", "Temple Street Night Market 廟街夜市")).toBe("MATCHED");
    expect(placeMatchConfidence("C Dessert", "Dessert Lab Central")).toBe("CHECK");
  });
  it("keeps result order while limiting parallel work", async () => {
    let active = 0, peak = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return value * 10;
    });
    expect(result).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
