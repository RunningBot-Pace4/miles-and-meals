import {
  and,
  eq,
  isNull,
} from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function loadUnreadNotificationCount(
  userId: string,
): Promise<number> {
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
            userId,
          ),
          isNull(
            notifications.readAt,
          ),
        ),
      );

    return rows.length;
  } catch {
    return 0;
  }
}
