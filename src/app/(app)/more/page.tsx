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

      <section className="panel menu-list account-summary-menu">
        <div className="menu-row">
          <span>Signed in as</span>
          <strong>{session.user.name}</strong>
        </div>
        <div className="menu-row">
          <span>Email</span>
          <strong>{session.user.email}</strong>
        </div>
      </section>

      <section className="panel menu-list">
        <div className="menu-section-title"><p className="eyebrow">TRIP TOOLS</p><h2>Plan, protect and review</h2></div>
        <Link className="menu-row link-row" href="/trips">
          <span>Create & manage my trips</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/offline">
          <span>Offline packs & Sync Centre</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/companion">
          <span>Smart Trip companion</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/documents">
          <span>Documents & emergency info</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/memories">
          <span>Trip memories</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/permissions">
          <span>Traveler permissions</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/budgets">
          <span>Budgets & category limits</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/receipts">
          <span>Receipt review</span>
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
        <Link className="menu-row link-row" href="/journeys">
          <span>Multi-country Journey · optional</span>
          <span>›</span>
        </Link>
      </section>

      <section className="panel menu-list">
        <div className="menu-section-title"><p className="eyebrow">ACCOUNT</p><h2>Your preferences</h2></div>
        <Link className="menu-row link-row" href="/settings/profile">
          <span>Profile & avatar</span>
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
        <Link className="menu-row link-row" href="/settings/password">
          <span>Change password</span>
          <span>›</span>
        </Link>
      </section>

      {admin ? (
        <section className="panel menu-list">
          <div className="menu-section-title"><p className="eyebrow">SYSTEM ADMIN</p><h2>Operations</h2></div>
          <Link className="menu-row link-row" href="/admin">
            <span>People, trips & countries</span>
            <span>›</span>
          </Link>
          <Link className="menu-row link-row" href="/admin/health">
            <span>App health & V90 readiness</span>
            <span>›</span>
          </Link>
          <Link className="menu-row link-row" href="/admin/backup">
            <span>Backup & restore</span>
            <span>›</span>
          </Link>
        </section>
      ) : null}

      <InstallAppCard />
    </div>
  );
}
