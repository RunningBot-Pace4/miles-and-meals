import {
  and,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  user,
  trips,
} from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import { ensureTripOwnerAccess, ensureTripMember } from "@/lib/access";
import {
  getCountryCatalogItem,
} from "@/lib/country-catalog";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { selfServiceTripSchema } from "@/lib/validation";

export async function POST(
  request: Request,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let createdTripId: string | null = null;

  try {
    const input = selfServiceTripSchema.parse(
      await request.json(),
    );
    const normalizedName = input.name
      .trim()
      .toLocaleLowerCase();
    const travelerIds = [...new Set(input.travelerIds)].filter(id => id !== session.user.id);
    const selectedTravelers = travelerIds.length ? await db.select({ id: user.id, banned: user.banned }).from(user).where(inArray(user.id, travelerIds)) : [];
    if (selectedTravelers.length !== travelerIds.length || selectedTravelers.some(person => person.banned)) {
      return Response.json({ error: "One or more selected travelers are unavailable. Refresh the list and try again." }, { status: 400 });
    }
    const destinationCountry = getCountryCatalogItem(
      input.firstCountry.code,
    );

    if (!destinationCountry) {
      return Response.json(
        {
          error: "Choose a valid destination country.",
        },
        { status: 400 },
      );
    }

    const duplicate = await db
      .select({ id: trips.id })
      .from(trips)
      .where(
        and(
          eq(trips.createdBy, session.user.id),
          sql`lower(trim(${trips.name})) = ${normalizedName}`,
        ),
      )
      .limit(1);

    if (duplicate[0]) {
      return Response.json(
        {
          error: "You already have a trip with this name.",
        },
        { status: 409 },
      );
    }

    const created = await db
      .insert(trips)
      .values({
        name: input.name,
        baseCurrency: input.baseCurrency,
        budget: "0",
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        createdBy: session.user.id,
      })
      .returning({ id: trips.id });

    const tripId = created[0]?.id;

    if (!tripId) {
      throw new Error("Trip could not be created.");
    }

    createdTripId = tripId;

    const createdCountries = await db
      .insert(countries)
      .values({
        tripId,
        name: destinationCountry.name,
        code: destinationCountry.code,
        currencyCode: destinationCountry.currencyCode,
        defaultExchangeRate:
          input.firstCountry.defaultExchangeRate.toFixed(10),
        fxRateDate:
          input.firstCountry.fxRateProvider === "Manual override"
            ? null
            : input.firstCountry.fxRateDate || null,
        fxRateProvider:
          input.firstCountry.fxRateProvider || "Manual",
      })
      .returning({ id: countries.id });

    const countryId = createdCountries[0]?.id ?? null;

    if (!countryId) {
      throw new Error("Destination could not be created.");
    }

    await ensureTripOwnerAccess(
      tripId,
      session.user.id,
      countryId,
    );

    await recordActivity({
      actorUserId: session.user.id,
      action: "CREATED",
      entityType: "TRIP",
      entityId: tripId,
      tripId,
      countryId,
      summary:
        `${session.user.name} created trip ${input.name} with ${destinationCountry.name}.`,
    });

    for (const userId of travelerIds) {
      await ensureTripMember(tripId, userId);
      await db.insert(countryMembers).values({ countryId, userId }).onConflictDoNothing();
      await recordActivity({ actorUserId: session.user.id, action: "ASSIGNED", entityType: "COUNTRY_MEMBER", entityId: `${countryId}:${userId}`, tripId, countryId, summary: `${session.user.name} assigned a traveler to ${input.name}.` });
    }

    return Response.json(
      {
        id: tripId,
        countryId,
        ownerAssigned: true,
      },
      { status: 201 },
    );
  } catch (error) {
    if (createdTripId) {
      try {
        await db
          .delete(trips)
          .where(eq(trips.id, createdTripId));
      } catch {
        // Best-effort rollback for a partially created self-service trip.
      }
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create trip.",
      },
      { status: 400 },
    );
  }
}
