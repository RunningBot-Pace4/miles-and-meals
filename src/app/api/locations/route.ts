import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { locationPings } from "@/db/schema";
import {
  canAccessCountry,
  listCountryMembers,
} from "@/lib/access";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";

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

  const members = await listCountryMembers(
    countryId,
    isSystemAdmin(session.user.role) ? session.user.id : undefined,
  );

  const memberIds = members.map((member) => member.id);

  const latestRows =
    memberIds.length === 0
      ? []
      : await db
          .selectDistinctOn([locationPings.userId], {
            userId: locationPings.userId,
            latitude: locationPings.latitude,
            longitude: locationPings.longitude,
            accuracyMeters: locationPings.accuracyMeters,
            createdAt: locationPings.createdAt,
          })
          .from(locationPings)
          .where(
            and(
              eq(locationPings.countryId, countryId),
              inArray(locationPings.userId, memberIds),
            ),
          )
          .orderBy(
            locationPings.userId,
            desc(locationPings.createdAt),
          );

  const latestByUser = new Map(
    latestRows.map((location) => [location.userId, location]),
  );

  const locations = members.map((member) => {
    const latest = latestByUser.get(member.id);

    return {
      userId: member.id,
      name: member.name,
      latitude: latest?.latitude ?? null,
      longitude: latest?.longitude ?? null,
      accuracyMeters: latest?.accuracyMeters ?? null,
      createdAt: latest?.createdAt ?? null,
    };
  });

  return Response.json({
    locations,
    serverTime: new Date().toISOString(),
  });
}
