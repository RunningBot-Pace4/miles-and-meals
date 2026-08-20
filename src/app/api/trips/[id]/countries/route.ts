import {
  and,
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  trips,
} from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  ensureTripMember,
} from "@/lib/access";
import {
  getCountryCatalogItem,
} from "@/lib/country-catalog";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import {
  canManageTrip,
} from "@/lib/trip-management";
import { createCountrySchema } from "@/lib/validation";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session =
    await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: tripId } =
    await context.params;

  if (
    !(await canManageTrip(
      session.user,
      tripId,
    ))
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input =
      createCountrySchema.parse({
        ...(await request.json()),
        tripId,
      });
    const catalogCountry =
      getCountryCatalogItem(
        input.code,
      );

    if (!catalogCountry) {
      return Response.json(
        {
          error:
            "Choose a country from the country list.",
        },
        { status: 400 },
      );
    }

    const tripRows = await db
      .select({
        id: trips.id,
        createdBy:
          trips.createdBy,
      })
      .from(trips)
      .where(
        eq(
          trips.id,
          tripId,
        ),
      )
      .limit(1);

    const trip =
      tripRows[0];

    if (!trip) {
      return Response.json(
        { error: "Trip not found." },
        { status: 404 },
      );
    }

    const duplicate =
      await db
        .select({
          id: countries.id,
        })
        .from(countries)
        .where(
          and(
            eq(
              countries.tripId,
              tripId,
            ),
            eq(
              countries.code,
              catalogCountry.code,
            ),
          ),
        )
        .limit(1);

    if (duplicate[0]) {
      return Response.json(
        {
          error:
            "This country is already in the trip.",
        },
        { status: 409 },
      );
    }

    const created =
      await db
        .insert(countries)
        .values({
          tripId,
          name:
            catalogCountry.name,
          code:
            catalogCountry.code,
          currencyCode:
            catalogCountry.currencyCode,
          defaultExchangeRate:
            input.defaultExchangeRate.toFixed(
              10,
            ),
          fxRateDate:
            input.fxRateProvider ===
            "Manual override"
              ? null
              : input.fxRateDate ||
                null,
          fxRateProvider:
            input.fxRateProvider ||
            "Manual",
        })
        .returning({
          id: countries.id,
        });

    const countryId =
      created[0]?.id;

    if (!countryId) {
      throw new Error(
        "Country could not be created.",
      );
    }

    if (
      trip.createdBy ===
      session.user.id
    ) {
      await ensureTripMember(
        tripId,
        session.user.id,
      );

      await db
        .insert(countryMembers)
        .values({
          countryId,
          userId:
            session.user.id,
        })
        .onConflictDoNothing();
    }

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "CREATED",
      entityType: "COUNTRY",
      entityId: countryId,
      tripId,
      countryId,
      summary:
        `${session.user.name} added ${catalogCountry.name} to the trip.`,
    });

    return Response.json(
      {
        id: countryId,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to add country.",
      },
      { status: 400 },
    );
  }
}
