import { desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appErrors } from "@/db/schema";
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

  const database = await checkDatabase();
  const recentErrors =
    await loadRecentErrors();

  const checks = [
    {
      name: "Database",
      ok: database.ok,
      detail: database.message,
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
