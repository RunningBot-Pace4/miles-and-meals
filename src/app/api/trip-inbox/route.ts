import { desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tripInboxItems } from "@/db/schema";
import { canAccessCountry, getCountryWithTrip, listAccessibleCountries } from "@/lib/access";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";

const inputSchema = z.object({
  countryId: z.string().uuid(),
  sourceType: z.enum(["PASTE", "IMAGE", "PDF", "TEXT", "EMAIL"]),
  sourceName: z.string().trim().max(250).optional().default(""),
  kind: z.enum(["FLIGHT", "HOTEL", "TICKET", "TRAIN", "BOOKING"]),
  title: z.string().trim().min(1).max(250),
  provider: z.string().trim().max(160).optional().default(""),
  confirmationNo: z.string().trim().max(100).optional().default(""),
  bookingDate: z.string().max(10).optional().default(""),
  bookingTime: z.string().max(30).optional().default(""),
});

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await listAccessibleCountries(session.user);
  const ids = allowed.map((row) => row.id);
  if (!ids.length) return Response.json({ items: [] });
  const items = await db
    .select({
      id: tripInboxItems.id,
      tripId: tripInboxItems.tripId,
      countryId: tripInboxItems.countryId,
      sourceType: tripInboxItems.sourceType,
      sourceName: tripInboxItems.sourceName,
      kind: tripInboxItems.kind,
      title: tripInboxItems.title,
      provider: tripInboxItems.provider,
      confirmationNo: tripInboxItems.confirmationNo,
      bookingDate: tripInboxItems.bookingDate,
      bookingTime: tripInboxItems.bookingTime,
      status: tripInboxItems.status,
      linkedTravelItemId: tripInboxItems.linkedTravelItemId,
      createdAt: tripInboxItems.createdAt,
      updatedAt: tripInboxItems.updatedAt,
    })
    .from(tripInboxItems)
    .where(inArray(tripInboxItems.countryId, ids))
    .orderBy(desc(tripInboxItems.createdAt))
    .limit(100);
  return Response.json({ items });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = inputSchema.parse(await request.json());
    if (!(await canAccessCountry(session.user, input.countryId))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const country = await getCountryWithTrip(input.countryId);
    if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
    const locked = await closedTripReadOnlyResponse(country.tripId);
    if (locked) return locked;
    const rows = await db.insert(tripInboxItems).values({
      tripId: country.tripId,
      countryId: input.countryId,
      sourceType: input.sourceType,
      sourceName: input.sourceName || null,
      kind: input.kind,
      title: input.title,
      provider: input.provider || null,
      confirmationNo: input.confirmationNo || null,
      bookingDate: input.bookingDate || null,
      bookingTime: input.bookingTime || null,
      // Raw email/PDF/OCR text is intentionally not persisted. The traveler
      // reviews extracted fields in the browser before save, minimizing the
      // chance that unrelated personal/payment details enter a shared Trip.
      rawText: null,
      createdBy: session.user.id,
    }).returning({ id: tripInboxItems.id });
    return Response.json({ id: rows[0]?.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save Trip Inbox item." }, { status: 400 });
  }
}
