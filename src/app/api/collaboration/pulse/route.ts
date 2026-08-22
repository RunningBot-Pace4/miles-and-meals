import { and, desc, gt, inArray, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { listAccessibleCountries } from "@/lib/access";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sinceRaw = url.searchParams.get("since") ?? "";
  const since = new Date(sinceRaw);
  const safeSince = Number.isNaN(since.getTime())
    ? new Date(Date.now() - 10_000)
    : new Date(Math.max(Date.now() - 60_000, since.getTime()));
  const accessible = await listAccessibleCountries(session.user);
  const countryIds = accessible.map((country) => country.id);
  const tripIds = [...new Set(accessible.map((country) => country.tripId))];

  if (countryIds.length === 0 && tripIds.length === 0) {
    return Response.json(
      { events: [], serverTime: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const scope =
    countryIds.length && tripIds.length
      ? or(
          inArray(activityLogs.countryId, countryIds),
          inArray(activityLogs.tripId, tripIds),
        )
      : countryIds.length
        ? inArray(activityLogs.countryId, countryIds)
        : inArray(activityLogs.tripId, tripIds);

  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      summary: activityLogs.summary,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .where(
      and(
        scope,
        gt(activityLogs.createdAt, safeSince),
        ne(activityLogs.actorUserId, session.user.id),
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(8);

  return Response.json(
    {
      events: rows
        .reverse()
        .map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
      serverTime: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
