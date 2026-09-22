import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTransactionalDatabase } from "@/db/transaction";
import { travelItems, trips } from "@/db/schema";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { getSession } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { itineraryRowSchema, MAX_ITINERARY_ROWS, newItineraryRows, itineraryDuration } from "@/lib/itinerary-import";
import { recordActivity } from "@/lib/activity";
export const runtime = "nodejs";
const inputSchema = z.object({ countryId: z.string().uuid(), rows: z.array(itineraryRowSchema).min(1).max(MAX_ITINERARY_ROWS) });
export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to import an itinerary." }, { status: 401 });
  let input: z.infer<typeof inputSchema>;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 1_000_000) return Response.json({ error: "Import is too large." }, { status: 413 });
    input = inputSchema.parse(JSON.parse(body));
  } catch { return Response.json({ error: "Check the selected rows, dates and map links." }, { status: 400 }); }
  if (!(await canAccessCountry(session.user, input.countryId))) return Response.json({ error: "Trip access denied." }, { status: 403 });
  const country = await getCountryWithTrip(input.countryId);
  if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
  if (!(await getTripCapabilities(session.user, country.tripId)).canEditPlan) return Response.json({ error: "You have view-only access to this trip's Plan." }, { status: 403 });
  const transactional = createTransactionalDatabase();
  try {
    const result = await transactional.database.transaction(async tx => {
      const trip = (await tx.select({ id: trips.id, status: trips.financialStatus }).from(trips).where(eq(trips.id, country.tripId)).for("update"))[0];
      if (!trip) return { error: "Trip not found.", status: 404 } as const;
      if (trip.status === "CLOSED") return { error: "This trip is closed. Reopen it before importing.", status: 423 } as const;
      const existing = await tx.select().from(travelItems).where(and(eq(travelItems.countryId, input.countryId), eq(travelItems.itemType, "ITINERARY")));
      const fresh = newItineraryRows(input.rows, existing.map(item => ({ ...item, itemDate: item.itemDate ?? "", itemTime: item.itemTime ?? "", area: item.area ?? "" })));
      const nextOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
      if (nextOrder + fresh.length > 100_001) return { error: "Too many itinerary items to append in order.", status: 400 } as const;
      const items = fresh.length ? await tx.insert(travelItems).values(fresh.map((row, index) => ({ ...row,
        countryId: input.countryId, itemType: "ITINERARY", itemDate: row.itemDate || null,
        status: "Planned", sortOrder: nextOrder + index, durationMinutes: itineraryDuration(row.itemTime),
        createdBy: session.user.id,
      }))).returning() : [];
      return { items, skipped: input.rows.length - fresh.length };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    if (result.items.length) await recordActivity({ actorUserId: session.user.id, action: "CREATED", entityType: "PLANNER", entityId: result.items[0].id, tripId: country.tripId, countryId: input.countryId, summary: `${session.user.name} imported ${result.items.length} itinerary activities.`, metadata: { itemType: "ITINERARY", count: result.items.length } }).catch(() => undefined);
    return Response.json({ imported: result.items.length, skipped: result.skipped, items: result.items.map(item => ({ ...item, proposedByName: session.user.name })) }, { status: result.items.length ? 201 : 200 });
  } catch { return Response.json({ error: "The import could not be confirmed. Retry; matching saved rows will be skipped." }, { status: 503 }); }
  finally { await transactional.close(); }
}
