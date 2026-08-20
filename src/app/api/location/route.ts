import { db } from "@/db";
import { locationPings } from "@/db/schema";
import {
  isCountryInActiveTrip,
} from "@/lib/active-trip";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { locationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = locationSchema.parse(await request.json());

    if (!(await isCountryInActiveTrip(session.user, input.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const inserted = await db
      .insert(locationPings)
      .values({
        countryId: input.countryId,
        userId: session.user.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters ?? null,
      })
      .returning({
        createdAt: locationPings.createdAt,
      });

    return Response.json(
      {
        ok: true,
        location: {
          userId: session.user.id,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters ?? null,
          createdAt: inserted[0]?.createdAt ?? new Date(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save location.";

    return Response.json({ error: message }, { status: 400 });
  }
}
