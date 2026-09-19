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

