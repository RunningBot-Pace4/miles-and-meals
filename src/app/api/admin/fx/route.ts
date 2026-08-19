import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { getDailyFxRate } from "@/lib/fx";
import { getSession, isSystemAdmin } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const tripId = url.searchParams.get("tripId")?.trim() ?? "";
  const currency = url.searchParams.get("currency")?.trim().toUpperCase() ?? "";

  if (!tripId || !/^[A-Z]{3}$/.test(currency)) {
    return Response.json(
      { error: "Choose a trip and valid currency first." },
      { status: 400 },
    );
  }

  const tripRows = await db
    .select({
      baseCurrency: trips.baseCurrency,
    })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  const trip = tripRows[0];

  if (!trip) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  try {
    const fx = await getDailyFxRate(
      currency,
      trip.baseCurrency,
    );

    return Response.json(fx);
  } catch (caught) {
    return Response.json(
      {
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to load the daily FX rate.",
      },
      { status: 502 },
    );
  }
}
