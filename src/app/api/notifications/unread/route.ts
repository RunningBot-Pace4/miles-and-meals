import {
  and,
  eq,
  isNull,
} from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function GET() {
  const session =
    await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const rows = await db
      .select({
        id: notifications.id,
      })
      .from(notifications)
      .where(
        and(
          eq(
            notifications.userId,
            session.user.id,
          ),
          isNull(
            notifications.readAt,
          ),
        ),
      );

    return Response.json(
      {
        unreadCount:
          rows.length,
      },
      {
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch {
    return Response.json({
      unreadCount: 0,
    });
  }
}
