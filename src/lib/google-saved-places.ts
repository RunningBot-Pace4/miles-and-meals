export const MAX_PLACES_FILE_BYTES = 1_000_000;
export const MAX_PLACES_PER_IMPORT = 250;

export type SavedPlaceDraft = {
  title: string;
  linkUrl: string;
  notes: string;
};

/** Accept navigation links only. These URLs are stored, never fetched by our server. */
export function googleMapsPlaceKey(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const isMaps = ((host === "google.com" || host === "www.google.com") && url.pathname.startsWith("/maps")) ||
      host === "maps.google.com" || host === "maps.app.goo.gl";
    if (!isMaps) return null;
    const feature = decodeURIComponent(url.pathname).match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1];
    // A feature's second hex ID and Google's decimal cid identify the same place.
    if (feature) return `cid:${BigInt(feature.split(":")[1]).toString()}`;
    const cid = url.searchParams.get("cid");
    if (cid && /^\d+$/.test(cid)) return `cid:${BigInt(cid).toString()}`;
    const placeId = url.searchParams.get("query_place_id");
    if (placeId) return `place:${placeId}`;
    url.hash = "";
    for (const name of [...url.searchParams.keys()]) {
      if (/^(utm_|g_ep$|entry$|skid$|g_st$)/i.test(name)) url.searchParams.delete(name);
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** RFC 4180-style fields, including quoted commas, escaped quotes and newlines. */
function readCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  const finishField = () => { row.push(field); field = ""; closedQuote = false; };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else field += char;
    } else if (char === ",") {
      finishField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      finishField(); rows.push(row); row = [];
    } else if (char === '"' && field === "" && !closedQuote) {
      quoted = true;
    } else if (closedQuote) {
      if (!/\s/.test(char)) throw new Error("This CSV has text outside a quoted field. Export the list again.");
    } else if (char === '"') {
      throw new Error("This CSV has an unexpected quote. Export the list again.");
    } else field += char;
  }
  if (quoted) throw new Error("This CSV has an unfinished quoted field. Export the list again.");
  finishField(); rows.push(row);
  return rows;
}

export function parseGoogleSavedPlaces(source: string): {
  places: SavedPlaceDraft[];
  warnings: string[];
  duplicateCount: number;
} {
  if (new TextEncoder().encode(source).length > MAX_PLACES_FILE_BYTES) throw new Error("Choose a CSV smaller than 1 MB.");
  const rows = readCsv(source.replace(/^\uFEFF/, ""));
  const headerIndex = rows.findIndex((row, index) => index < 10 &&
    row.some((cell) => cell.trim().toLowerCase() === "title") &&
    row.some((cell) => cell.trim().toLowerCase() === "url"));
  if (headerIndex < 0) throw new Error("Choose a Google Saved list CSV with Title and URL columns.");
  const header = rows[headerIndex].map((cell) => cell.trim().toLowerCase());
  if (new Set(header).size !== header.length) throw new Error("This CSV contains repeated column headings.");
  const records = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell.trim()));
  if (records.length > MAX_PLACES_PER_IMPORT) throw new Error(`Import up to ${MAX_PLACES_PER_IMPORT} places at a time.`);
  const places: SavedPlaceDraft[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  records.forEach((row, index) => {
    const get = (name: string) => (row[header.indexOf(name)] ?? "").trim();
    const title = get("title");
    const linkUrl = get("url");
    const notes = [get("note"), get("tags") ? `Tags: ${get("tags")}` : "", get("comment") ? `Comment: ${get("comment")}` : ""].filter(Boolean).join("\n\n");
    const key = googleMapsPlaceKey(linkUrl);
    if (row.length !== header.length || !title || title.length > 250 || !key || linkUrl.length > 1000 || notes.length > 1000) {
      warnings.push(`Record ${index + 1}${title ? ` (${title.slice(0, 60)})` : ""} was skipped. Check its title, Google Maps link and field lengths.`);
      return;
    }
    if (seen.has(key)) { duplicateCount++; return; }
    seen.add(key);
    places.push({ title, linkUrl, notes });
  });
  if (!places.length) throw new Error("No valid places found. Each place needs a title and an HTTPS Google Maps link.");
  return { places, warnings, duplicateCount };
}

export function newSavedPlaces(places: SavedPlaceDraft[], existingLinks: Array<string | null>): SavedPlaceDraft[] {
  const seen = new Set(existingLinks.map((link) => link ? googleMapsPlaceKey(link) : null).filter(Boolean));
  return places.filter((place) => {
    const key = googleMapsPlaceKey(place.linkUrl);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
