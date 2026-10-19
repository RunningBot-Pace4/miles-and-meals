import { eq } from "drizzle-orm";
import { z } from "zod";
import { countryMembers, trips, user } from "@/db/schema";
import { createTransactionalDatabase } from "@/db/transaction";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { guestParticipantProfile, isGuestParticipantId } from "@/lib/guest-participant";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";

const inputSchema = z.object({ name: z.string().trim().min(1).max(80), requestId: z.string().uuid() });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id: countryId } = await context.params;
  if (!(await canAccessCountry(session.user, countryId))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const country = await getCountryWithTrip(countryId);
  if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
  if (!(await getTripCapabilities(session.user, country.tripId)).canAddExpenses) return Response.json({ error: "You cannot add travelers to this trip's expenses." }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a guest name of up to 80 characters." }, { status: 400 });
  const profile = guestParticipantProfile(countryId, parsed.data.requestId, parsed.data.name);
  const client = createTransactionalDatabase();
  try {
    const result = await client.database.transaction(async tx => {
      const locked = await tx.select({ status: trips.financialStatus }).from(trips).where(eq(trips.id, country.tripId)).for("update");
      if (!locked[0] || locked[0].status !== "OPEN") return null;
      const assigned = await tx.select({ id: user.id, name: user.name }).from(countryMembers).innerJoin(user, eq(user.id, countryMembers.userId)).where(eq(countryMembers.countryId, countryId));
      const retry = assigned.find(person => person.id === profile.id);
      if (retry) {
        if (retry.name !== profile.name) throw new Error("This guest save request was already used for another name.");
        return retry;
      }
      const existing = assigned.find(person => isGuestParticipantId(person.id) && person.name.toLocaleLowerCase() === profile.name.toLocaleLowerCase());
      if (existing) return existing;
      if (assigned.length >= 30) throw new Error("A trip can split expenses between up to 30 travelers.");
      // No account, session, credentials, trip permissions or invitation is created.
      await tx.insert(user).values(profile);
      await tx.insert(countryMembers).values({ countryId, userId: profile.id });
      return { id: profile.id, name: profile.name };
    });
    if (!result) return Response.json({ error: "Trip is closed. Reopen it before adding guests." }, { status: 423 });
    return Response.json({ guest: { ...result, isGuest: true } });
  } catch (error) {
    return Response.json({ error: error instanceof Error && /save request|30 travelers/.test(error.message) ? error.message : "Unable to save guest. Try again." }, { status: 409 });
  } finally { await client.close(); }
}
