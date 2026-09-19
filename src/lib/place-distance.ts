export type Coordinates = { latitude: number; longitude: number };
export function coordinates(value: string): Coordinates | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]), longitude = Number(match[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}
export function placeCoordinates(link: string, notes = ""): Coordinates | null {
  const explicit = notes.match(/(?:^|\n)Coordinates: ([^\n]+)/)?.[1];
  if (explicit) return coordinates(explicit);
  try {
    const url = new URL(link);
    const query = url.searchParams.get("query") || url.searchParams.get("q") || "";
    const fromQuery = coordinates(query);
    if (fromQuery) return fromQuery;
    const pin = decodeURIComponent(url.pathname).match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    return pin ? coordinates(`${pin[1]},${pin[2]}`) : null;
  } catch { return null; }
}
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function sortFromStay<T extends { linkUrl: string; notes: string }>(places: T[], stay: Coordinates): T[] {
  return [...places].sort((a, b) => {
    const aPoint = placeCoordinates(a.linkUrl, a.notes), bPoint = placeCoordinates(b.linkUrl, b.notes);
    if (!aPoint) return bPoint ? 1 : 0;
    if (!bPoint) return -1;
    return distanceKm(stay, aPoint) - distanceKm(stay, bPoint);
  });
}
