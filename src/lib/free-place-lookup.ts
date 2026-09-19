import { placeMatchConfidence, type GooglePlaceMatch } from "./google-places";

// Open-data lookup only. Never falls back to a billable Google API.
export async function searchFreePlace(input: { clientKey: string; title: string; countryName: string; apiKey: string; fetcher?: typeof fetch }): Promise<GooglePlaceMatch | null> {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.search = new URLSearchParams({ text: `${input.title}, ${input.countryName}`, format: "json", limit: "3", apiKey: input.apiKey }).toString();
  const response = await (input.fetcher ?? fetch)(url.toString(), { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 429 ? "Free location lookup limit reached. Please try again later." : "Location lookup unavailable. Check your free Geoapify key or try later.");
  const body = await response.json() as { results?: Array<{ lat?: number; lon?: number; name?: string; formatted?: string; place_id?: string; result_type?: string }> };
  const place = body.results?.find(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && !["country", "state", "county", "city", "postcode", "suburb"].includes(p.result_type ?? ""));
  if (!place) return null;
  if ((place.name ?? "").trim().toLowerCase() === input.countryName.trim().toLowerCase() && input.title.trim().toLowerCase() !== input.countryName.trim().toLowerCase()) return null;
  const matchedName = place.name || place.formatted || input.title;
  return { clientKey: input.clientKey, title: input.title, matchedName, formattedAddress: place.formatted ?? "", latitude: place.lat!, longitude: place.lon!, placeId: place.place_id ?? "", googleMapsUri: "", confidence: placeMatchConfidence(input.title, matchedName) };
}
