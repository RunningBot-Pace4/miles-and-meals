import { placeCoordinates, type Coordinates } from "@/lib/place-distance";
export type RouteMode = "walk" | "drive";
export function routePinKey(start: Coordinates, end: Coordinates, mode: RouteMode) {
  return JSON.stringify([start.latitude, start.longitude, end.latitude, end.longitude, mode]);
}
type RouteItem = { id: string; countryId: string; itemType: string; subtype: string | null; linkUrl: string | null; notes: string | null };
export function resolveRoutePins(items: RouteItem[], countryId: string, stayId: string, placeId: string) {
  const stay = items.find(item => item.id === stayId && item.countryId === countryId && item.subtype === "Accommodation");
  const place = items.find(item => item.id === placeId && item.countryId === countryId && ["PLACE", "FOOD", "SHOPPING"].includes(item.itemType));
  if (!stay || !place) return null;
  const start = placeCoordinates(stay.linkUrl ?? "", stay.notes ?? "");
  const end = placeCoordinates(place.linkUrl ?? "", place.notes ?? "");
  return start && end ? { start, end } : null;
}
