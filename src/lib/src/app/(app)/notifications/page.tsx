import {
  and,
  desc,
  eq,
  isNull,
} from "drizzle-orm";
import { NotificationCenter } from "@/components/NotificationCenter";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requirePageSession } from "@/lib/session";

type InitialInbox = {
  unreadCount: number;
  items: Array<{
    id: string;
    category: string;
    title: string;
    body: string;
    url: string;
    readAt: string | null;
    createdAt: string;
  }>;
};

async function loadInbox(
  userId: string,
): Promise<InitialInbox> {
  try {
    const [items, unread] =
      await Promise.all([
        db
          .select({
            id: notifications.id,
            category:
              notifications.category,
            title: notifications.title,
            body: notifications.body,
            url: notifications.url,
            readAt: notifications.readAt,
            createdAt:
              notifications.createdAt,
          })
          .from(notifications)
          .where(
            eq(
              notifications.userId,
              userId,
            ),
          )
          .orderBy(
            desc(
              notifications.createdAt,
            ),
          )
          .limit(100),
        db
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
          ),
      ]);

    return {
      unreadCount:
        unread.length,
      items: items.map(
        (item) => ({
          ...item,
          readAt:
            item.readAt?.toISOString() ??
            null,
          createdAt:
            item.createdAt.toISOString(),
        }),
      ),
    };
  } catch {
    return {
      unreadCount: 0,
      items: [],
    };
  }
}

export default async function NotificationsPage() {
  const session =
    await requirePageSession();
  const initial =
    await loadInbox(
      session.user.id,
    );

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            TRIP UPDATES
          </p>
          <h1>Notifications</h1>
          <p className="muted">
            Payment, expense and planner updates you may have missed.
          </p>
        </div>
      </div>

      <NotificationCenter
        initial={initial}
      />
    </div>
  );
}
