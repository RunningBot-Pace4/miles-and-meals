import {
  and,
  desc,
  inArray,
} from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { listAccessibleCountries } from "@/lib/access";
import { getSession } from "@/lib/session";

type LiveEntity =
  | "SETTLEMENT"
  | "EXPENSE"
  | "PLANNER";

type VersionRow = {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date;
};

function versionToken(
  row: VersionRow | undefined,
): string {
  if (!row) {
    return "none";
  }

  return [
    row.id,
    row.action,
    row.createdAt.toISOString(),
  ].join(":");
}

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

  const countries =
    await listAccessibleCountries(session.user);
  const countryIds = countries.map(
    (country) => country.id,
  );

  if (countryIds.length === 0) {
    return Response.json(
      {
        ok: true,
        settlementVersion: "none",
        expenseVersion: "none",
        plannerVersion: "none",
        serverTime: new Date().toISOString(),
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  const entityTypes: LiveEntity[] = [
    "SETTLEMENT",
    "EXPENSE",
    "PLANNER",
  ];

  const rows = await db
    .selectDistinctOn(
      [activityLogs.entityType],
      {
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        createdAt: activityLogs.createdAt,
      },
    )
    .from(activityLogs)
    .where(
      and(
        inArray(
          activityLogs.countryId,
          countryIds,
        ),
        inArray(
          activityLogs.entityType,
          entityTypes,
        ),
      ),
    )
    .orderBy(
      activityLogs.entityType,
      desc(activityLogs.createdAt),
    );

  const latest = new Map<
    LiveEntity,
    VersionRow
  >();

  for (const row of rows) {
    const entityType =
      row.entityType as LiveEntity;

    if (
      entityTypes.includes(entityType) &&
      !latest.has(entityType)
    ) {
      latest.set(entityType, row);
    }
  }

  return Response.json(
    {
      ok: true,
      settlementVersion:
        versionToken(
          latest.get("SETTLEMENT"),
        ),
      expenseVersion:
        versionToken(
          latest.get("EXPENSE"),
        ),
      plannerVersion:
        versionToken(
          latest.get("PLANNER"),
        ),
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
