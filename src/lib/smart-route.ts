import { placeCoordinates } from "./place-distance";

export type SmartRouteItem = {
  id: string;
  title: string;
  itemDate: string | null;
  itemTime: string | null;
  area: string | null;
  durationMinutes: number | null;
  sortOrder: number;
  linkUrl?: string | null;
  notes?: string | null;
};

export type TravelMode = "driving" | "walking" | "transit" | "bicycling";

function minutes(value: string | null): number | null {
  const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)(?:\s*[-–—]\s*(?:[01]\d|2[0-3]):[0-5]\d)?$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function suggestedDayOrder(items: SmartRouteItem[]): SmartRouteItem[] {
  // Relative times belong in the author's sequence, not after every clock time.
  if (items.some(item => minutes(item.itemTime) === null)) {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return [...items].sort((a, b) => minutes(a.itemTime)! - minutes(b.itemTime)! || a.sortOrder - b.sortOrder);
}

export function routePoint(item: SmartRouteItem): string | null {
  const point = placeCoordinates(item.linkUrl ?? "", item.notes ?? "");
  return point ? `${point.latitude},${point.longitude}` : null;
}

export function analyzeDayRoute(items: SmartRouteItem[], mode: TravelMode) {
  const ordered = suggestedDayOrder(items);
  const defaultBuffer = { driving: 25, walking: 20, transit: 35, bicycling: 20 }[mode];
  const warnings: string[] = [];
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];
    const start = minutes(current.itemTime);
    const nextStart = minutes(next.itemTime);
    if (start === null || nextStart === null) continue;
    const end = start + (current.durationMinutes ?? 60);
    if (nextStart < end) warnings.push(`${current.title} overlaps ${next.title}.`);
    else if (current.area && next.area && current.area !== next.area && nextStart - end < defaultBuffer) {
      warnings.push(`Allow more ${mode} time between ${current.title} and ${next.title}.`);
    }
  }
  return { ordered, warnings, missingTimes: ordered.filter((item) => !item.itemTime).length };
}

export function dayRouteUrl(items: SmartRouteItem[], mode: TravelMode): string {
  const stops = suggestedDayOrder(items).map(routePoint);
  // Mobile supports at most three intermediate stops; transit uses individual legs.
  if (stops.length < 2 || stops.some(stop => !stop) || stops.length > 5 || (mode === "transit" && stops.length > 2)) return "";
  const parameters = new URLSearchParams({ api: "1", origin: stops[0]!, destination: stops.at(-1)!, travelmode: mode });
  if (stops.length > 2) parameters.set("waypoints", stops.slice(1, -1).join("|"));
  return `https://www.google.com/maps/dir/?${parameters.toString()}`;
}

export function dayRouteLegs(items: SmartRouteItem[], mode: TravelMode) {
  const ordered = suggestedDayOrder(items);
  return ordered.slice(1).map((to, index) => {
    const from = ordered[index];
    // Preserve adjacency: never silently skip an unresolved stop.
    const url = dayRouteUrl([{ ...from, itemTime: null, sortOrder: 0 }, { ...to, itemTime: null, sortOrder: 1 }], mode);
    return { from, to, url };
  });
}
