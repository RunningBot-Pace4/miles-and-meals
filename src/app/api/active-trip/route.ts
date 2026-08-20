import { NextResponse } from "next/server";
import {
  ACTIVE_TRIP_COOKIE,
} from "@/lib/active-trip";
import {
  listAccessibleCountries,
} from "@/lib/access";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

export async function POST(
  request: Request,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session =
    await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const payload =
      (await request.json()) as {
        tripId?: unknown;
      };
    const tripId =
      typeof payload.tripId ===
      "string"
        ? payload.tripId.trim()
        : "";

    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "Choose a trip.",
        },
        { status: 400 },
      );
    }

    const countries =
      await listAccessibleCountries(
        session.user,
      );

    if (
      !countries.some(
        (country) =>
          country.tripId ===
          tripId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this trip.",
        },
        { status: 403 },
      );
    }

    const response =
      NextResponse.json({
        ok: true,
        tripId,
      });

    response.cookies.set({
      name:
        ACTIVE_TRIP_COOKIE,
      value: tripId,
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 *
        60 *
        24 *
        365,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to switch trip.",
      },
      { status: 400 },
    );
  }
}
