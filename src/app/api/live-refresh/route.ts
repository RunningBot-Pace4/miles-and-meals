import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { listAccessibleCountries } from "@/lib/access";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  const countries = await listAccessibleCountries(
    session.user,
  );
  const countryIds = countries.map(
    (country) => country.id,
  );

  const latest =
    countryIds.length === 0
      ? null
      : (
          await db
            .select({
              id: settlements.id,
              status: settlements.status,
              updatedAt: settlements.updatedAt,
            })
            .from(settlements)
            .where(
              inArray(
                settlements.countryId,
                countryIds,
              ),
            )
            .orderBy(
              desc(settlements.updatedAt),
              desc(settlements.createdAt),
            )
            .limit(1)
        )[0] ?? null;

  const settlementVersion = latest
    ? [
        latest.id,
        latest.status,
        latest.updatedAt.toISOString(),
      ].join(":")
    : "none";

  return Response.json(
    {
      ok: true,
      settlementVersion,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
