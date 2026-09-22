import type { PlannerItem } from "./planner-types";

export function scheduledPlace(item: PlannerItem, date: string, time: string, items: PlannerItem[]) {
  return {
    countryId: item.countryId, itemType: "ITINERARY" as const, title: item.title,
    itemDate: date, itemTime: time, area: item.area ?? "", subtype: item.subtype ?? "",
    linkUrl: item.linkUrl ?? "", notes: item.notes ?? "", status: "Planned",
    sortOrder: String(Math.min(100_000, Math.max(0, ...items.filter(row => row.countryId === item.countryId && row.itemType === "ITINERARY" && row.itemDate === date).map(row => row.sortOrder)) + 1)),
    durationMinutes: "60",
  };
}

export function itineraryDays(items: PlannerItem[], start?: string | null, end?: string | null) {
  const days = new Set(items.filter(item => item.itemType === "ITINERARY" && item.itemDate).map(item => item.itemDate!));
  if (start && end) {
    const from = Date.parse(`${start}T00:00:00Z`), to = Date.parse(`${end}T00:00:00Z`);
    // Bound unusually long trips; dates containing saved activities always remain visible.
    for (let time = from, count = 0; time <= to && count < 366; time += 86_400_000, count++) days.add(new Date(time).toISOString().slice(0, 10));
  }
  return [...days].sort();
}
