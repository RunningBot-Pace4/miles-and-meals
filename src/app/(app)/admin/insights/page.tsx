import { and, count, desc, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { db } from "@/db";
import { appErrors, productEvents } from "@/db/schema";
import { loadPerformanceSnapshot } from "@/lib/health";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

export const runtime = "nodejs";

const WINDOW_DAYS = 7;

export default async function AdminInsightsPage() {
  const session = await requirePageSession();

  if (!isSystemAdmin(session.user.role)) {
    redirect("/dashboard");
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [eventCounts, routeCounts, contextCounts, errorCountRows, performance] =
    await Promise.all([
      db
        .select({
          eventName: productEvents.eventName,
          total: count(productEvents.id),
        })
        .from(productEvents)
        .where(gte(productEvents.createdAt, since))
        .groupBy(productEvents.eventName),
      db
        .select({
          route: productEvents.route,
          total: count(productEvents.id),
        })
        .from(productEvents)
        .where(
          and(
            gte(productEvents.createdAt, since),
            eq(productEvents.eventName, "page_view"),
          ),
        )
        .groupBy(productEvents.route)
        .orderBy(desc(count(productEvents.id)))
        .limit(10),
      db
        .select({
          context: productEvents.context,
          total: count(productEvents.id),
        })
        .from(productEvents)
        .where(gte(productEvents.createdAt, since))
        .groupBy(productEvents.context),
      db
        .select({ total: count(appErrors.id) })
        .from(appErrors)
        .where(gte(appErrors.createdAt, since)),
      loadPerformanceSnapshot(),
    ]);

  const events = new Map<string, number>(
    eventCounts.map((row) => [row.eventName, Number(row.total)] as const),
  );
  const pageViews = Number(events.get("page_view") ?? 0);
  const expenseSaved = Number(events.get("expense_saved") ?? 0);
  const expenseFailed = Number(events.get("expense_save_failed") ?? 0);
  const saveAttempts = expenseSaved + expenseFailed;
  const saveSuccessRate = saveAttempts
    ? Math.round((expenseSaved / saveAttempts) * 1000) / 10
    : 100;
  const errors = Number(errorCountRows[0]?.total ?? 0);

  return (
    <div className="stack gap-lg admin-insights-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PHASE 13 · PRODUCT SIGNALS</p>
          <h1>Product insights</h1>
          <p className="muted">
            Privacy-minimal usage signals for the last {WINDOW_DAYS} days. No merchant names,
            expense amounts, itinerary titles or location coordinates are collected here.
          </p>
        </div>
        <Link className="button secondary" href="/admin/health">
          App health
        </Link>
      </div>

      <section className="insights-kpi-grid" aria-label="Product health summary">
        <article>
          <span>Page views</span>
          <strong>{pageViews}</strong>
          <small>Authenticated app navigation</small>
        </article>
        <article>
          <span>Expense save success</span>
          <strong>{saveSuccessRate}%</strong>
          <small>{expenseSaved} saved · {expenseFailed} failed</small>
        </article>
        <article>
          <span>Smart Settlement views</span>
          <strong>{Number(events.get("smart_settlement_viewed") ?? 0)}</strong>
          <small>Recommendation engagement</small>
        </article>
        <article>
          <span>Client errors</span>
          <strong>{errors}</strong>
          <small>Captured authenticated crashes/errors</small>
        </article>
        <article>
          <span>API P95</span>
          <strong>{performance.p95Ms} ms</strong>
          <small>{performance.samples} recent API samples</small>
        </article>
        <article>
          <span>Offline queued</span>
          <strong>{Number(events.get("offline_change_queued") ?? 0)}</strong>
          <small>Changes protected during connection loss</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">TOP ROUTES</p>
            <h2>Where travelers spend time</h2>
          </div>
        </div>
        {routeCounts.length ? (
          <div className="insights-list">
            {routeCounts.map((row) => (
              <article key={row.route}>
                <strong>{row.route}</strong>
                <span>{Number(row.total)} views</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Usage signals will appear as travelers use this release.</p>
        )}
      </section>

      <section className="panel insights-two-column">
        <div>
          <p className="eyebrow">KEY EVENTS</p>
          <h2>Core journey signals</h2>
          <div className="insights-list compact">
            {[...eventCounts]
              .sort((a, b) => Number(b.total) - Number(a.total))
              .map((row) => (
                <article key={row.eventName}>
                  <strong>{row.eventName.replaceAll("_", " ")}</strong>
                  <span>{Number(row.total)}</span>
                </article>
              ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">DEVICE CONTEXT</p>
          <h2>How the app is opened</h2>
          <div className="insights-list compact">
            {contextCounts.map((row) => (
              <article key={row.context ?? "unknown"}>
                <strong>{row.context ?? "unknown"}</strong>
                <span>{Number(row.total)}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
