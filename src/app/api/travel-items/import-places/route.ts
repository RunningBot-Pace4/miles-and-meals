import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createTransactionalDatabase } from "@/db/transaction";
import { travelItems, trips } from "@/db/schema";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { getSession } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { googleMapsPlaceKey, MAX_PLACES_PER_IMPORT, newSavedPlaces } from "@/lib/google-saved-places";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";

const importSchema = z.object({
  countryId: z.string().uuid(),
  places: z.array(z.object({
    title: z.string().trim().min(1).max(250),
    linkUrl: z.string().trim().max(1000).refine((value) => !!googleMapsPlaceKey(value)),
    notes: z.string().trim().max(1000).default(""),
    itemType: z.enum(["PLACE", "FOOD", "SHOPPING"]).default("PLACE"),
  })).min(1).max(MAX_PLACES_PER_IMPORT),
});

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in before importing places." }, { status: 401 });
  let input: z.infer<typeof importSchema>;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 1_000_000) return Response.json({ error: "Import is too large." }, { status: 413 });
    input = importSchema.parse(JSON.parse(body));
  } catch {
    return Response.json({ error: "Check the selected places. Each needs a title and a valid Google Maps link." }, { status: 400 });
  }

  if (!(await canAccessCountry(session.user, input.countryId))) {
    return Response.json({ error: "You no longer have access to this trip." }, { status: 403 });
  }
  const country = await getCountryWithTrip(input.countryId);
  if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
  const capabilities = await getTripCapabilities(session.user, country.tripId);
  if (!capabilities.canEditPlan) return Response.json({ error: "You have view-only access to this trip's Plan." }, { status: 403 });

  const transactional = createTransactionalDatabase();
  try {
    const result = await transactional.database.transaction(async (tx) => {
      // Serializes imports for this trip and shares the financial-close lock.
      // A lost response can safely be retried: saved map identities are skipped.
      const trip = (await tx.select({ id: trips.id, status: trips.financialStatus })
        .from(trips).where(eq(trips.id, country.tripId)).for("update"))[0];
      if (!trip) return { error: "Trip not found.", status: 404 } as const;
      if (trip.status === "CLOSED") return { error: "This trip is closed. Reopen it before importing places.", status: 423 } as const;
      const existing = await tx.select({ linkUrl: travelItems.linkUrl, sortOrder: travelItems.sortOrder })
        .from(travelItems).where(and(eq(travelItems.countryId, input.countryId), inArray(travelItems.itemType, ["PLACE", "FOOD", "SHOPPING"])));
      const fresh = newSavedPlaces(input.places, existing.map((item) => item.linkUrl));
      const nextOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
      const items = fresh.length ? await tx.insert(travelItems).values(fresh.map((place, index) => ({
        countryId: input.countryId,
        itemType: place.itemType ?? "PLACE",
        title: place.title,
        linkUrl: place.linkUrl,
        notes: place.notes || null,
        provider: "Google Maps",
        status: "Idea",
        sortOrder: Math.min(100_000, nextOrder + index),
        createdBy: session.user.id,
      }))).returning() : [];
      return { items, skipped: input.places.length - fresh.length };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    if (result.items.length) {
      // An activity-log outage must not turn an already committed import into an error.
      await recordActivity({
        actorUserId: session.user.id,
        action: "CREATED",
        entityType: "PLANNER",
        entityId: result.items[0].id,
        tripId: country.tripId,
        countryId: input.countryId,
        summary: `${session.user.name} imported ${result.items.length} places from Google Maps.`,
        metadata: { itemType: "PLACE", count: result.items.length },
      }).catch(() => undefined);
    }
    return Response.json({
      items: result.items.map((item) => ({ ...item, proposedByName: session.user.name })),
      imported: result.items.length,
      skipped: result.skipped,
    }, { status: result.items.length ? 201 : 200 });
  } catch {
    return Response.json({ error: "The import could not be confirmed. Try again; places already saved will be skipped." }, { status: 503 });
  } finally {
    await transactional.close();
  }
}
