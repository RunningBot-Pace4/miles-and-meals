import { db } from "@/db";
import { countries } from "@/db/schema";
import { getSession, isSystemAdmin } from "@/lib/session";
import { createCountrySchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = createCountrySchema.parse(await request.json());
    const created = await db
      .insert(countries)
      .values({
        tripId: input.tripId,
        name: input.name,
        code: input.code,
        currencyCode: input.currencyCode,
        defaultExchangeRate: input.defaultExchangeRate.toFixed(10),
      })
      .returning({ id: countries.id });

    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create country.";
    return Response.json({ error: message }, { status: 400 });
  }
}
