import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { listActivityForUser } from "@/lib/activity";
import { requirePageSession } from "@/lib/session";

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat(
    "en-MY",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    },
  ).format(value);
}

function iconForEntity(entityType: string): string {
  if (entityType === "EXPENSE") {
    return "◫";
  }

  if (entityType === "PLANNER") {
    return "✦";
  }

  if (entityType === "SETTLEMENT") {
    return "↔";
  }

  if (entityType === "USER") {
    return "◎";
  }

  if (entityType === "TRIP") {
    return "✈";
  }

  if (entityType === "COUNTRY") {
    return "⌖";
  }

  return "•";
}

export default async function ActivityPage() {
  const session = await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const activity =
    await listActivityForUser(
      session.user,
      120,
      activeTrip.tripId,
      activeTrip.countries.map(
        (country) =>
          country.id,
      ),
    );

  return (
    <div className="stack gap-lg activity-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PHASE 8 · HISTORY</p>
          <h1>Trip activity</h1>
          <p className="muted">
            See shared changes for the active trip across expenses,
            plans and settlements.
          </p>
        </div>
      </div>

      <section className="panel activity-panel">
        {activity.length === 0 ? (
          <div className="empty-card-feature">
            <div className="empty-icon">✦</div>
            <div>
              <h2>No activity yet</h2>
              <p className="muted">
                New Phase 8 changes will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="activity-list">
            {activity.map((item) => (
              <article
                className="activity-row"
                key={item.id}
              >
                <span
                  className="activity-icon"
                  aria-hidden="true"
                >
                  {iconForEntity(item.entityType)}
                </span>
                <div className="activity-copy">
                  <strong>{item.summary}</strong>
                  <small>
                    {item.actorName ?? "System"} ·{" "}
                    {formatTime(item.createdAt)}
                  </small>
                </div>
                <span className="activity-action">
                  {item.action
                    .replaceAll("_", " ")
                    .toLowerCase()}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
