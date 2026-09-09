import { and, eq, isNull } from "drizzle-orm";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { InstallAppCard } from "@/components/InstallAppCard";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

async function loadUnreadNotificationCount(
  userId: string,
): Promise<number> {
  try {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
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
    await loadUnreadNotificationCount(session.user.id);

  return (
    <div className="stack gap-lg more-hub-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MORE</p>
          <h1>Trip & account tools</h1>
          <p className="muted">
            Less-used tools stay here. Planning and money now have their own main tabs.
          </p>
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
        <div className="menu-section-title">
          <p className="eyebrow">TRIP</p>
          <h2>Places & people</h2>
        </div>
        <Link className="menu-row link-row" href="/trips">
          <span>Create & manage trips</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/location">
          <span>Map & live location</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/permissions">
          <span>Travelers & permissions</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/documents">
          <span>Documents & emergency info</span>
          <span>›</span>
        </Link>
      </section>

      <section className="panel menu-list">
        <div className="menu-section-title">
          <p className="eyebrow">STORY & UPDATES</p>
          <h2>Remember and review</h2>
        </div>
        <Link className="menu-row link-row" href="/trip-story">
          <span>Trip Story · memories & Wrapped</span>
          <span>›</span>
        </Link>
        {/* Direct /memories and /wrapped routes are retained inside Trip Story. */}
        <Link className="menu-row link-row" href="/updates">
          <span>
            Updates
            {unreadNotificationCount > 0
              ? ` · ${unreadNotificationCount} new`
              : ""}
          </span>
          <span>›</span>
        </Link>
      </section>

      <section className="panel menu-list">
        <div className="menu-section-title">
          <p className="eyebrow">APP & ACCOUNT</p>
          <h2>Preferences & reliability</h2>
        </div>
        <Link className="menu-row link-row" href="/offline">
          <span>Offline packs & Sync Centre</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/profile">
          <span>Profile & avatar</span>
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

      <details className="panel menu-list more-advanced-tools">
        <summary>
          <span>
            <small>ADVANCED</small>
            <strong>Search, export & Journey tools</strong>
          </span>
          <b>⌄</b>
        </summary>
        <Link className="menu-row link-row" href="/search">
          <span>Search trips</span>
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
      </details>

      {admin ? (
        <section className="panel menu-list">
          <div className="menu-section-title">
            <p className="eyebrow">SYSTEM ADMIN</p>
            <h2>Operations</h2>
          </div>
          <Link className="menu-row link-row" href="/admin">
            <span>People, trips & countries</span>
            <span>›</span>
          </Link>
          <Link className="menu-row link-row" href="/admin/health">
            <span>App health &amp; release readiness</span>
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
