import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { countries, travelItems, trips } from "@/db/schema";
import { canAccessTrip } from "@/lib/access";
import { getSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function compactDate(date: string): string {
  return date.replace(/-/g, "");
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get("tripId") ?? "";
  if (!uuidSchema.safeParse(tripId).success || !(await canAccessTrip(session.user, tripId))) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  const countryRows = await db.select({ id: countries.id }).from(countries).where(eq(countries.tripId, tripId));
  const tripRows = await db.select({ name: trips.name }).from(trips).where(eq(trips.id, tripId)).limit(1);
  const ids = countryRows.map((row) => row.id);
  const items = ids.length ? await db
    .select()
    .from(travelItems)
    .where(and(inArray(travelItems.countryId, ids), eq(travelItems.itemType, "ITINERARY")))
    .orderBy(asc(travelItems.itemDate), asc(travelItems.sortOrder), asc(travelItems.itemTime)) : [];

  const events = items.filter((item) => item.itemDate).map((item) => {
    const date = compactDate(item.itemDate as string);
    const parsedTime = item.itemTime?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    const time = parsedTime ? `${parsedTime[1]}${parsedTime[2]}` : "";
    const start = time ? `${date}T${time}00` : date;
    const endDate = new Date(`${item.itemDate}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const allDayEnd = compactDate(endDate.toISOString().slice(0, 10));
    const duration = Math.max(15, item.durationMinutes ?? 60);
    const timedEndDate = parsedTime
      ? new Date(`${item.itemDate}T${parsedTime[1]}:${parsedTime[2]}:00Z`)
      : null;
    if (timedEndDate) timedEndDate.setUTCMinutes(timedEndDate.getUTCMinutes() + duration);
    const timedEnd = timedEndDate
      ? timedEndDate.toISOString().slice(0, 19).replace(/[-:]/g, "")
      : allDayEnd;
    return [
      "BEGIN:VEVENT",
      `UID:${item.id}@miles-and-meals`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      time ? `DTSTART:${start}` : `DTSTART;VALUE=DATE:${start}`,
      time ? `DTEND:${timedEnd}` : `DTEND;VALUE=DATE:${timedEnd}`,
      `SUMMARY:${escapeIcs(item.title)}`,
      item.area ? `LOCATION:${escapeIcs(item.area)}` : "",
      item.notes ? `DESCRIPTION:${escapeIcs(item.notes)}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Miles & Meals//Trip Plan//EN",
    `X-WR-CALNAME:${escapeIcs(tripRows[0]?.name ?? "Miles & Meals Trip")}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(calendar, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="miles-meals-trip.ics"`,
      "cache-control": "private, no-store",
    },
  });
}
