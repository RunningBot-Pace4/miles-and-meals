import { cookies } from "next/headers";
import {
  listAccessibleCountries,
  type SessionUser,
} from "@/lib/access";

export const ACTIVE_TRIP_COOKIE =
  "mnm_active_trip";

export type ActiveTripContext = {
  tripId: string;
  countries: Awaited<
    ReturnType<
      typeof listAccessibleCountries
    >
  >;
  allCountries: Awaited<
    ReturnType<
      typeof listAccessibleCountries
    >
  >;
  trips: Array<{
    id: string;
    name: string;
    baseCurrency: string;
    startDate: string | null;
    endDate: string | null;
    financialStatus: string;
    financialVersion: number;
  }>;
};

function uniqueTrips(
  countries: Awaited<
    ReturnType<
      typeof listAccessibleCountries
    >
  >,
) {
  const tripMap =
    new Map<
      string,
      {
        id: string;
        name: string;
        baseCurrency: string;
        startDate:
          | string
          | null;
        endDate:
          | string
          | null;
        financialStatus: string;
        financialVersion: number;
      }
    >();

  for (const country of countries) {
    if (
      tripMap.has(
        country.tripId,
      )
    ) {
      continue;
    }

    tripMap.set(
      country.tripId,
      {
        id: country.tripId,
        name:
          country.tripName,
        baseCurrency:
          country.baseCurrency,
        startDate:
          country.startDate,
        endDate:
          country.endDate,
        financialStatus:
          country.financialStatus,
        financialVersion:
          country.financialVersion,
      },
    );
  }

  return [
    ...tripMap.values(),
  ].sort(
    (left, right) =>
      left.name.localeCompare(
        right.name,
      ),
  );
}

export async function getActiveTripContext(
  currentUser: SessionUser,
): Promise<ActiveTripContext> {
  const allCountries =
    await listAccessibleCountries(
      currentUser,
    );
  const trips =
    uniqueTrips(
      allCountries,
    );

  if (
    allCountries.length === 0
  ) {
    return {
      tripId: "",
      countries: [],
      allCountries,
      trips,
    };
  }

  const cookieStore =
    await cookies();
  const cookieTripId =
    cookieStore.get(
      ACTIVE_TRIP_COOKIE,
    )?.value ?? "";
  const accessibleTripIds =
    new Set(
      trips.map(
        (trip) =>
          trip.id,
      ),
    );
  const tripId =
    accessibleTripIds.has(
      cookieTripId,
    )
      ? cookieTripId
      : trips[0]?.id ?? "";

  return {
    tripId,
    countries:
      allCountries.filter(
        (country) =>
          country.tripId ===
          tripId,
      ),
    allCountries,
    trips,
  };
}

export async function isCountryInActiveTrip(
  currentUser: SessionUser,
  countryId: string,
): Promise<boolean> {
  const active =
    await getActiveTripContext(
      currentUser,
    );

  return active.countries.some(
    (country) =>
      country.id ===
      countryId,
  );
}
