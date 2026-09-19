export type GooglePlaceMatch = {
  clientKey: string;
  title: string;
  matchedName: string;
  formattedAddress: string;
  googleMapsUri: string;
  placeId: string;
  latitude: number;
  longitude: number;
  confidence: "MATCHED" | "CHECK";
};

type GoogleTextPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
};

function words(value: string): string[] {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(Boolean);
}

export function placeMatchConfidence(query: string, matchedName: string): "MATCHED" | "CHECK" {
  const requested = words(query);
  const matched = new Set(words(matchedName));
  if (!requested.length) return "CHECK";
  const overlap = requested.filter((word) => matched.has(word)).length / requested.length;
  return overlap >= 0.75 || words(matchedName).join(" ") === requested.join(" ") ? "MATCHED" : "CHECK";
}

export function googlePlaceId(notes: string | null | undefined): string | null {
  return notes?.match(/(?:^|\n)Google Place ID: ([A-Za-z0-9_-]{3,300})(?:\n|$)/)?.[1] ?? null;
}

async function googleResponse(response: Response, input: { clientKey: string; title: string }): Promise<GooglePlaceMatch | null> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Places lookup failed (${response.status})${detail.includes("API_KEY") ? ": check the server API key." : "."}`);
  }
  const body = await response.json() as GoogleTextPlace & { places?: GoogleTextPlace[] };
  const candidates = body.places ?? [body];
  const place = candidates.find((candidate) => Number.isFinite(candidate.location?.latitude) && Number.isFinite(candidate.location?.longitude));
  if (!place?.id || !place.displayName?.text || !place.location || !Number.isFinite(place.location.latitude) || !Number.isFinite(place.location.longitude)) return null;
  return {
    clientKey: input.clientKey, title: input.title, matchedName: place.displayName.text,
    formattedAddress: place.formattedAddress ?? "", googleMapsUri: place.googleMapsUri ?? "", placeId: place.id,
    latitude: place.location.latitude as number, longitude: place.location.longitude as number,
    confidence: placeMatchConfidence(input.title, place.displayName.text),
  };
}

export async function searchGooglePlace(input: {
  clientKey: string;
  title: string;
  countryName: string;
  apiKey: string;
  fetcher?: typeof fetch;
}): Promise<GooglePlaceMatch | null> {
  const response = await (input.fetcher ?? fetch)("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": input.apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location",
    },
    body: JSON.stringify({ textQuery: `${input.title}, ${input.countryName}`, pageSize: 3 }),
    signal: AbortSignal.timeout(12_000),
  });
  return googleResponse(response, input);
}

export async function getGooglePlace(input: { clientKey: string; title: string; placeId: string; apiKey: string; fetcher?: typeof fetch }): Promise<GooglePlaceMatch | null> {
  if (!/^[A-Za-z0-9_-]{3,300}$/.test(input.placeId)) return null;
  const response = await (input.fetcher ?? fetch)(`https://places.googleapis.com/v1/places/${encodeURIComponent(input.placeId)}`, {
    headers: { "X-Goog-Api-Key": input.apiKey, "X-Goog-FieldMask": "id,displayName,formattedAddress,googleMapsUri,location" },
    signal: AbortSignal.timeout(12_000),
  });
  return googleResponse(response, input);
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => run()));
  return output;
}
