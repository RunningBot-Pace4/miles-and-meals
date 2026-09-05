import {
  and,
  eq,
  isNull,
  sql,
} from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { notifications } from "@/db/schema";

const readUnreadNotificationCount = cache(async (
  userId: string,
): Promise<number> => {
  try {
    const rows = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(notifications)
      .where(
        and(
          eq(
            notifications.userId,
            userId,
          ),
          isNull(
            notifications.readAt,
          ),
        ),
      );

    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
});

export async function loadUnreadNotificationCount(
  userId: string,
): Promise<number> {
  return readUnreadNotificationCount(userId);
}
