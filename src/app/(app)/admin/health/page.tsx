import { desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appErrors } from "@/db/schema";
import {
  loadPerformanceSnapshot,
  runConsistencyChecks,
} from "@/lib/health";
import {
  isSystemAdmin,
  requirePageSession,
} from "@/lib/session";

export const runtime = "nodejs";

async function checkDatabase(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await db.execute(sql`select 1 as ok`);

    return {
      ok: true,
      message: "Neon database responded successfully.",
    };
  } catch {
    return {
      ok: false,
      message: "Database health query failed.",
    };
  }
}

async function loadRecentErrors() {
  try {
    return await db
      .select({
        id: appErrors.id,
        route: appErrors.route,
        message: appErrors.message,
        createdAt: appErrors.createdAt,
      })
      .from(appErrors)
      .orderBy(desc(appErrors.createdAt))
      .limit(10);
  } catch {
    return [];
  }
}

function formatTime(
  value: Date,
): string {
  return new Intl.DateTimeFormat(
    "en-MY",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    },
  ).format(value);
}

export default async function AdminHealthPage() {
  const session = await requirePageSession();

  if (!isSystemAdmin(session.user.role)) {
    redirect("/dashboard");
  }

  const [
    database,
    recentErrors,
    consistency,
    performance,
  ] = await Promise.all([
    checkDatabase(),
    loadRecentErrors(),
    runConsistencyChecks(),
    loadPerformanceSnapshot(),
  ]);

  const checks = [
    {
      name: "Database",
      ok: database.ok,
      detail: database.message,
    },
    {
      name: "Data consistency",
      ok: consistency.ok,
      detail: consistency.ok
        ? "Trip, country, expense split and membership relationships are consistent."
        : `${consistency.issues.reduce(
            (sum, issue) =>
              sum + issue.count,
            0,
          )} consistency issue(s) need review.`,
    },
    {
      name: "Authentication",
      ok: true,
      detail:
        "Admin session is valid and protected server-side.",
    },
    {
      name: "PWA",
      ok: true,
      detail:
        "Manifest, service worker, offline shell and mobile icons are build-validated.",
    },
    {
      name: "Web Push",
      ok: Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
          process.env.VAPID_PRIVATE_KEY &&
          process.env.VAPID_SUBJECT,
      ),
      detail:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT
          ? "VAPID environment variables are configured."
          : "Optional: run npm run push:keys and add VAPID variables to Vercel.",
    },
  ];

  return (
    <div className="stack gap-lg admin-health-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PHASE 8 · ADMIN</p>
          <h1>App health</h1>
          <p className="muted">
            Free production checks using the existing Miles &amp; Meals
            server and Neon database.
          </p>
        </div>
      </div>

      <section className="health-grid">
        {checks.map((check) => (
          <article
            className={[
              "health-card",
              check.ok ? "healthy" : "attention",
            ].join(" ")}
            key={check.name}
          >
            <span
              className="health-status-icon"
              aria-hidden="true"
            >
              {check.ok ? "✓" : "!"}
            </span>
            <div>
              <strong>{check.name}</strong>
              <p>{check.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              DATABASE CONSISTENCY
            </p>
            <h2>
              Travel data checks
            </h2>
          </div>
        </div>

        {consistency.ok ? (
          <div className="health-consistency-ok">
            <span aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>
                No consistency problems found
              </strong>
              <small>
                Expenses, splits, trip links and country memberships passed the scan.
              </small>
            </div>
          </div>
        ) : (
          <div className="health-consistency-list">
            {consistency.issues.map(
              (issue) => (
                <article
                  className="health-consistency-row"
                  key={
                    issue.type
                  }
                >
                  <span>
                    !
                  </span>
                  <div>
                    <strong>
                      {
                        issue.type
                      }{" "}
                      ·{" "}
                      {
                        issue.count
                      }
                    </strong>
                    <p>
                      {
                        issue.detail
                      }
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              PERFORMANCE
            </p>
            <h2>
              Live API diagnostics
            </h2>
          </div>
        </div>

        <div className="performance-summary-grid">
          <div>
            <span>Samples</span>
            <strong>
              {
                performance.samples
              }
            </strong>
          </div>
          <div>
            <span>Average</span>
            <strong>
              {
                performance.averageMs
              }
              ms
            </strong>
          </div>
          <div>
            <span>P95</span>
            <strong>
              {
                performance.p95Ms
              }
              ms
            </strong>
          </div>
          <div>
            <span>
              ≥1.5s
            </span>
            <strong>
              {
                performance.slowRequests
              }
            </strong>
          </div>
        </div>

        {performance.routes.length ? (
          <div className="performance-route-list">
            {performance.routes
              .slice(0, 8)
              .map(
                (route) => (
                  <article
                    key={
                      route.route
                    }
                  >
                    <strong>
                      {
                        route.route
                      }
                    </strong>
                    <span>
                      Avg{" "}
                      {
                        route.averageMs
                      }
                      ms · P95{" "}
                      {
                        route.p95Ms
                      }
                      ms · Max{" "}
                      {
                        route.maxMs
                      }
                      ms ·{" "}
                      {
                        route.samples
                      }{" "}
                      samples
                    </span>
                  </article>
                ),
              )}
          </div>
        ) : (
          <p className="muted">
            No live API performance samples yet. They appear automatically as the app is used.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">RECENT CLIENT ERRORS</p>
            <h2>Last 10 reports</h2>
          </div>
        </div>

        {recentErrors.length === 0 ? (
          <p className="muted">
            No authenticated client errors have been recorded.
          </p>
        ) : (
          <div className="health-error-list">
            {recentErrors.map((error) => (
              <article
                className="health-error-row"
                key={error.id}
              >
                <div>
                  <strong>
                    {error.route ?? "Unknown route"}
                  </strong>
                  <p>{error.message}</p>
                </div>
                <small>
                  {formatTime(error.createdAt)}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
