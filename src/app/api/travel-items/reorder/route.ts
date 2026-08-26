import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { travelItems } from "@/db/schema";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { plannerReorderSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = plannerReorderSchema.parse(await request.json());
    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json({ error: "Trip not found." }, { status: 404 });
    }
    const country = await getCountryWithTrip(input.countryId);
    if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
    const locked = await closedTripReadOnlyResponse(country.tripId);
    if (locked) return locked;

    const rows = await db
      .select({ id: travelItems.id })
      .from(travelItems)
      .where(and(
        eq(travelItems.countryId, input.countryId),
        inArray(travelItems.id, input.itemIds),
      ));
    if (rows.length !== input.itemIds.length) {
      return Response.json({ error: "Some plan items no longer exist in this Trip." }, { status: 409 });
    }

    await Promise.all(input.itemIds.map((id, index) =>
      db.update(travelItems).set({ sortOrder: index + 1, updatedAt: new Date() }).where(eq(travelItems.id, id)),
    ));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to reorder the plan." },
      { status: 400 },
    );
  }
}
