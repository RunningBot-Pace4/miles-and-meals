import { z } from "zod";

export const MAX_ITINERARY_ROWS = 200;
export const MAX_ITINERARY_BYTES = 2_000_000;
export function validPlanDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const itineraryRowSchema = z.object({
  title: z.string().trim().min(1).max(250),
  itemDate: z.string().refine(value => value === "" || validPlanDate(value), "Use YYYY-MM-DD or leave the date blank."),
  itemTime: z.string().trim().max(100).default(""),
  area: z.string().trim().max(120).default(""),
  subtype: z.string().trim().max(100).default(""),
  linkUrl: z.string().trim().max(1000).refine(value => !value || /^https?:\/\//i.test(value) && URL.canParse(value), "Use an HTTP or HTTPS map link." ).default(""),
  notes: z.string().trim().max(1000).default(""),
});
export type ItineraryRow = z.infer<typeof itineraryRowSchema>;
export type ItineraryPreviewRow = ItineraryRow & { rowNumber: number; duplicate: boolean; errors: string[] };
export function itineraryKey(row: Pick<ItineraryRow, "title" | "itemDate" | "itemTime" | "area">) {
  return JSON.stringify([row.itemDate, row.itemTime, row.area, row.title].map(value => (value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")));
}
export function itineraryDuration(timing: string): number | null {
  const match = timing.match(/^([01]\d|2[0-3]):([0-5]\d)\s*[-–—]\s*([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const duration = Number(match[3]) * 60 + Number(match[4]) - Number(match[1]) * 60 - Number(match[2]);
  return duration > 0 ? duration : null;
}
export function newItineraryRows(rows: ItineraryRow[], existing: Array<Pick<ItineraryRow, "title" | "itemDate" | "itemTime" | "area">>) {
  const seen = new Set(existing.map(itineraryKey));
  return rows.filter(row => { const key = itineraryKey(row); if (seen.has(key)) return false; seen.add(key); return true; });
}
