import {
  and,
  eq,
  inArray,
} from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  trips,
} from "@/db/schema";
import {
  ensureTripMember,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
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
import {
  createCountriesBulkSchema,
} from "@/lib/validation";

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
      createCountriesBulkSchema.parse(
        await request.json(),
      );

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

    const normalized = input.countries.map(
      (item) => {
        const catalog =
          getCountryCatalogItem(
            item.code,
          );

        if (!catalog) {
          throw new Error(
            `Choose a valid country for ${item.code}.`,
          );
        }

        return {
          catalog,
          defaultExchangeRate:
            item.defaultExchangeRate,
          fxRateDate:
            item.fxRateDate,
          fxRateProvider:
            item.fxRateProvider,
        };
      },
    );

    const codes =
      normalized.map(
        (item) =>
          item.catalog.code,
      );
    const uniqueCodes =
      new Set(codes);

    if (
      uniqueCodes.size !==
      codes.length
    ) {
      return Response.json(
        {
          error:
            "A country can only be added once in the same batch.",
        },
        { status: 400 },
      );
    }

    const existingForTrip =
      await db
        .select({
          code: countries.code,
        })
        .from(countries)
        .where(
          and(
            eq(
              countries.tripId,
              tripId,
            ),
            inArray(
              countries.code,
              codes,
            ),
          ),
        );

    const existingCodes =
      new Set(
        existingForTrip.map(
          (row) =>
            row.code,
        ),
      );

    const duplicateCode =
      codes.find(
        (code) =>
          existingCodes.has(
            code,
          ),
      );

    if (duplicateCode) {
      return Response.json(
        {
          error:
            "One of the selected countries is already in this trip.",
        },
        { status: 409 },
      );
    }

    const created =
      await db
        .insert(countries)
        .values(
          normalized.map(
            (item) => ({
              tripId,
              name:
                item.catalog.name,
              code:
                item.catalog.code,
              currencyCode:
                item.catalog.currencyCode,
              defaultExchangeRate:
                item.defaultExchangeRate.toFixed(
                  10,
                ),
              fxRateDate:
                item.fxRateProvider ===
                "Manual override"
                  ? null
                  : item.fxRateDate ||
                    null,
              fxRateProvider:
                item.fxRateProvider ||
                "Manual",
            }),
          ),
        )
        .returning({
          id: countries.id,
          code: countries.code,
        });

    if (
      created.length !==
      normalized.length
    ) {
      throw new Error(
        "Not all countries were created.",
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
        .values(
          created.map(
            (country) => ({
              countryId:
                country.id,
              userId:
                session.user.id,
            }),
          ),
        )
        .onConflictDoNothing();
    }

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "CREATED_BULK",
      entityType: "COUNTRY",
      tripId,
      summary:
        `${session.user.name} added ${created.length} destination countries to the trip.`,
      metadata: {
        countryCodes:
          created.map(
            (country) =>
              country.code,
          ),
      },
    });

    return Response.json(
      {
        countries: created,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to add countries.",
      },
      { status: 400 },
    );
  }
}
