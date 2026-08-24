import {
  and,
  eq,
  isNull,
} from "drizzle-orm";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { InstallAppCard } from "@/components/InstallAppCard";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

async function loadUnreadNotificationCount(
  userId: string,
): Promise<number> {
  try {
    const rows =
      await db
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

export default async function MorePage() {
  const session = await requirePageSession();
  const admin = isSystemAdmin(session.user.role);
  const unreadNotificationCount =
    await loadUnreadNotificationCount(
      session.user.id,
    );

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>More</h1>
        </div>
      </div>

      <section className="panel menu-list">
        <div className="menu-row">
          <span>Signed in as</span>
          <strong>{session.user.name}</strong>
        </div>
        <div className="menu-row">
          <span>Email</span>
          <strong>{session.user.email}</strong>
        </div>
        {admin ? (
          <>
            <Link className="menu-row link-row" href="/admin">
              <span>Admin: people, trips & countries</span>
              <span>›</span>
            </Link>
            <Link className="menu-row link-row" href="/admin/health">
              <span>Admin: app health</span>
              <span>›</span>
            </Link>
            <Link className="menu-row link-row" href="/admin/backup">
              <span>Admin: backup & restore</span>
              <span>›</span>
            </Link>
          </>
        ) : null}
        <Link className="menu-row link-row" href="/trips">
          <span>Create & manage my trips</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/journeys">
          <span>Multi-country Journeys · optional organizer</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/inbox">
          <span>Trip Inbox · bookings & reservations</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/offline">
          <span>Offline pack & sync</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/budgets">
          <span>My trip budgets</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/profile">
          <span>Profile & avatar</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/password">
          <span>Change password</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/notifications">
          <span>
            Notification center
            {unreadNotificationCount > 0
              ? ` · ${unreadNotificationCount} new`
              : ""}
          </span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/notifications">
          <span>Notification settings</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/search">
          <span>Search trips</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/activity">
          <span>Trip activity</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/wrapped">
          <span>Trip Wrapped</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/export">
          <span>Export trip data</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/planner">
          <span>Planner sections</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/expenses">
          <span>All trip expenses</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settlements">
          <span>Settle Up · paid & received</span>
          <span>›</span>
        </Link>
      </section>

      <InstallAppCard />
    </div>
  );
}
