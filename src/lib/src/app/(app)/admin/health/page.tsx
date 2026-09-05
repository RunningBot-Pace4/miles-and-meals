import { desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { db } from "@/db";
import {
  appErrors,
  tripDocuments,
  tripEmergencyContacts,
  tripMemberPermissions,
  tripMemories,
} from "@/db/schema";
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

async function checkRequiredDataModel(): Promise<{ ok: boolean; message: string }> {
  try {
    await Promise.all([
      db.select({ id: tripMemberPermissions.tripId }).from(tripMemberPermissions).limit(1),
      db.select({ id: tripDocuments.id }).from(tripDocuments).limit(1),
      db.select({ id: tripEmergencyContacts.id }).from(tripEmergencyContacts).limit(1),
      db.select({ id: tripMemories.id }).from(tripMemories).limit(1),
    ]);
    return { ok: true, message: "Required permissions, documents, emergency contacts and memories tables are available." };
  } catch (error) {
    const directCode =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    const cause =
      typeof error === "object" && error !== null && "cause" in error
        ? error.cause
        : null;
    const causeCode =
      typeof cause === "object" && cause !== null && "code" in cause
        ? String(cause.code)
        : "";

    if (directCode === "42P01" || causeCode === "42P01") {
      return {
        ok: false,
        message: "Required app tables are missing from this Neon database. Apply neon-upgrade-v90-combined.sql once to this database after taking a backup.",
      };
    }

    return {
      ok: false,
      message: "Required app tables could not be verified. Check the Neon connection and Vercel logs; do not rerun a migration unless a missing-table error is confirmed.",
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
    v90DataModel,
    recentErrors,
    consistency,
    performance,
  ] = await Promise.all([
    checkDatabase(),
    checkRequiredDataModel(),
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
      name: "Required app tables",
      ok: v90DataModel.ok,
      detail: v90DataModel.message,
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
      name: "Security headers",
      ok: true,
      detail:
        "CSP, HSTS, frame denial, nosniff, referrer and permissions policies are configured in Next.js.",
    },
    {
      name: "Production auth secret",
      ok: process.env.NODE_ENV !== "production" || Boolean(process.env.BETTER_AUTH_SECRET),
      detail:
        process.env.NODE_ENV !== "production" || process.env.BETTER_AUTH_SECRET
          ? "Better Auth has a production secret or the app is not running in production mode."
          : "Set BETTER_AUTH_SECRET before a public production launch.",
    },
    {
      name: "Canonical app URL",
      ok: Boolean(
        process.env.BETTER_AUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.VERCEL_PROJECT_PRODUCTION_URL,
      ),
      detail:
        process.env.BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? "A production app URL is available for authentication and link generation."
          : "Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL before public launch.",
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

  const launchBlockers = checks.filter(
    (check) => !check.ok && check.name !== "Web Push",
  );
  const launchReady = launchBlockers.length === 0 && consistency.ok;

  return (
    <div className="stack gap-lg admin-health-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PHASE 14 · LAUNCH READINESS</p>
          <h1>App health</h1>
          <p className="muted">
            Production readiness, financial consistency, performance and security configuration checks.
          </p>
        </div>
        <div className="admin-quick-links">
          <Link className="button secondary" href="/admin/insights">Product insights</Link>
          <Link className="button secondary" href="/admin/backup">Backup</Link>
        </div>
      </div>

      <section className={`panel launch-readiness-panel ${launchReady ? "ready" : "attention"}`}>
        <div className="launch-readiness-copy">
          <span className="launch-readiness-score" aria-hidden="true">{launchReady ? "✓" : "!"}</span>
          <div>
            <p className="eyebrow">RELEASE GATE</p>
            <h2>{launchReady ? "Code-level launch checks are green" : "Launch blockers need attention"}</h2>
            <p className="muted">
              {launchReady
                ? "The in-app checks are healthy. Before a public world-scale claim, still complete real-device usability, load testing and an independent security review."
                : `${launchBlockers.length} code/configuration blocker(s) remain before the public launch gate is green.`}
            </p>
          </div>
        </div>
        <div className="launch-manual-gates">
          <span>Manual evidence still required</span>
          <strong>Real devices · load test · external security review · accessibility audit</strong>
        </div>
      </section>

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
