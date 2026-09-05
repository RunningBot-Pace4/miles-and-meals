export type SmartRouteItem = {
  id: string;
  title: string;
  itemDate: string | null;
  itemTime: string | null;
  area: string | null;
  durationMinutes: number | null;
  sortOrder: number;
};

export type TravelMode = "driving" | "walking" | "transit" | "bicycling";

function minutes(value: string | null): number | null {
  const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function areaTokens(value: string | null): Set<string> {
  return new Set((value ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
}

function similarity(left: string | null, right: string | null): number {
  const a = areaTokens(left);
  const b = areaTokens(right);
  let score = 0;
  for (const token of a) if (b.has(token)) score += 1;
  return score;
}

export function suggestedDayOrder(items: SmartRouteItem[]): SmartRouteItem[] {
  const timed = items.filter((item) => minutes(item.itemTime) !== null)
    .sort((a, b) => (minutes(a.itemTime) ?? 0) - (minutes(b.itemTime) ?? 0));
  const remaining = items.filter((item) => minutes(item.itemTime) === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const result = [...timed];
  while (remaining.length) {
    const previous = result.at(-1);
    let bestIndex = 0;
    if (previous?.area) {
      for (let index = 1; index < remaining.length; index += 1) {
        if (similarity(previous.area, remaining[index].area) > similarity(previous.area, remaining[bestIndex].area)) bestIndex = index;
      }
    }
    result.push(remaining.splice(bestIndex, 1)[0]);
  }
  return result;
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
  const stops = suggestedDayOrder(items).map((item) => item.area?.trim()).filter((area): area is string => Boolean(area)).slice(0, 10);
  if (stops.length < 2) return "";
  const parameters = new URLSearchParams({ api: "1", origin: stops[0], destination: stops.at(-1) as string, travelmode: mode });
  if (stops.length > 2) parameters.set("waypoints", stops.slice(1, -1).join("|"));
  return `https://www.google.com/maps/dir/?${parameters.toString()}`;
}
