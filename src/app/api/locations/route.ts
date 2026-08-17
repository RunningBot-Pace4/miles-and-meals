import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { countryMembers, locationPings, user } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const countryId = new URL(request.url).searchParams.get("countryId");

  if (!countryId) {
    return Response.json({ error: "countryId is required." }, { status: 400 });
  }

  if (!(await canAccessCountry(session.user, countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      userId: locationPings.userId,
      name: user.name,
      latitude: locationPings.latitude,
      longitude: locationPings.longitude,
      accuracyMeters: locationPings.accuracyMeters,
      createdAt: locationPings.createdAt,
    })
    .from(locationPings)
    .innerJoin(user, eq(user.id, locationPings.userId))
    .innerJoin(
      countryMembers,
      and(
        eq(countryMembers.countryId, locationPings.countryId),
        eq(countryMembers.userId, locationPings.userId),
      ),
    )
    .where(eq(locationPings.countryId, countryId))
    .orderBy(desc(locationPings.createdAt));

  const seen = new Set<string>();
  const locations = rows.filter((row) => {
    if (seen.has(row.userId)) {
      return false;
    }

    seen.add(row.userId);
    return true;
  });

  return Response.json({ locations });
}
