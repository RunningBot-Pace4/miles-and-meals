import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { WrappedTripSelect } from "@/components/WrappedTripSelect";
import { db } from "@/db";
import { expenses, settlements, travelItems } from "@/db/schema";
import { getActiveTripContext } from "@/lib/active-trip";
import { buildExpenseSummary } from "@/lib/dashboard";
import { effectiveConvertedAmount, formatMoney } from "@/lib/money";
import { requirePageSession } from "@/lib/session";
import { loadTripBudgetSummary } from "@/lib/trip-budget";

function tripDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function dateLabel(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "Dates not set";
  const format = (value: string) =>
    new Intl.DateTimeFormat("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));

  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate ?? endDate ?? "");
}

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string }>;
}) {
  const query = await searchParams;
  const session = await requirePageSession();
  const context = await getActiveTripContext(session.user);
  const selectedTrip =
    context.trips.find((trip) => trip.id === query.tripId) ??
    context.trips.find((trip) => trip.id === context.tripId) ??
    context.trips[0] ??
    null;

  if (!selectedTrip) {
    return (
      <div className="stack gap-lg wrapped-page">
        <section className="planner-empty">
          <div>✦</div>
          <h2>No trip to wrap yet</h2>
          <p>Create or join a trip first, then your travel story will appear here.</p>
          <Link className="button primary" href="/trips">Create trip</Link>
        </section>
      </div>
    );
  }

  const countryIds = context.allCountries
    .filter((country) => country.tripId === selectedTrip.id)
    .map((country) => country.id);

  const [summary, budget, expenseRows, plannerRows, settlementRows] = await Promise.all([
    buildExpenseSummary(countryIds),
    loadTripBudgetSummary(session.user.id, selectedTrip.id, countryIds),
    countryIds.length
      ? db
          .select({
            id: expenses.id,
            description: expenses.description,
            category: expenses.category,
            convertedAmount: expenses.convertedAmount,
            actualConvertedAmount: expenses.actualConvertedAmount,
            expenseDate: expenses.expenseDate,
          })
          .from(expenses)
          .where(inArray(expenses.countryId, countryIds))
          .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      : Promise.resolve([]),
    countryIds.length
      ? db
          .select({
            id: travelItems.id,
            itemType: travelItems.itemType,
            status: travelItems.status,
          })
          .from(travelItems)
          .where(and(inArray(travelItems.countryId, countryIds), ne(travelItems.itemType, "BOOKING")))
      : Promise.resolve([]),
    db
      .select({
        id: settlements.id,
        status: settlements.status,
      })
      .from(settlements)
      .where(eq(settlements.tripId, selectedTrip.id)),
  ]);

  const me = summary.people.find((person) => person.userId === session.user.id);
  const topCategory = summary.categories[0] ?? null;
  const biggest = expenseRows
    .map((row) => ({
      ...row,
      effective: effectiveConvertedAmount(row.convertedAmount, row.actualConvertedAmount),
    }))
    .sort((a, b) => b.effective - a.effective)[0] ?? null;
  const donePlans = plannerRows.filter((item) =>
    /done|confirmed|complete/i.test(item.status ?? ""),
  ).length;
  const completedSettlements = settlementRows.filter((item) => item.status === "SETTLED").length;
  const days = tripDays(selectedTrip.startDate, selectedTrip.endDate);
  const averagePerDay = days && days > 0 ? summary.total / days : null;
  const mealCount = expenseRows.filter((item) => item.category === "Food").length;

  return (
    <div className="stack gap-lg wrapped-page">
      <div className="page-heading wrapped-heading">
        <div>
          <p className="eyebrow">TRIP WRAPPED</p>
          <h1>Your travel story</h1>
          <p className="muted">A simple snapshot of the miles, meals and money behind this trip.</p>
        </div>

        <WrappedTripSelect
          trips={context.trips.map((trip) => ({ id: trip.id, name: trip.name }))}
          selectedId={selectedTrip.id}
        />
      </div>

      <section className="wrapped-hero">
        <span className="wrapped-kicker">MILES &amp; MEALS · {selectedTrip.baseCurrency}</span>
        <h2>{selectedTrip.name}</h2>
        <p>{dateLabel(selectedTrip.startDate, selectedTrip.endDate)}</p>
        <div className="wrapped-hero-number">
          <strong>{formatMoney(summary.total, selectedTrip.baseCurrency)}</strong>
          <span>group spend</span>
        </div>
      </section>

      <section className="wrapped-stat-grid">
        <article className="wrapped-stat-card">
          <span>My share</span>
          <strong>{formatMoney(me?.share ?? 0, selectedTrip.baseCurrency)}</strong>
          <small>{budget.myBudget > 0 ? `${Math.round(((me?.share ?? 0) / budget.myBudget) * 100)}% of my budget` : "Personal spend"}</small>
        </article>
        <article className="wrapped-stat-card">
          <span>Top category</span>
          <strong>{topCategory?.category ?? "—"}</strong>
          <small>{topCategory ? formatMoney(topCategory.amount, selectedTrip.baseCurrency) : "No expenses yet"}</small>
        </article>
        <article className="wrapped-stat-card">
          <span>Biggest spend</span>
          <strong>{biggest?.description ?? "—"}</strong>
          <small>{biggest ? formatMoney(biggest.effective, selectedTrip.baseCurrency) : "No expenses yet"}</small>
        </article>
        <article className="wrapped-stat-card">
          <span>Travel crew</span>
          <strong>{budget.travelerCount}</strong>
          <small>{budget.travelerCount === 1 ? "traveler" : "travelers"}</small>
        </article>
        <article className="wrapped-stat-card">
          <span>Meals logged</span>
          <strong>{mealCount}</strong>
          <small>food &amp; drink expenses</small>
        </article>
        <article className="wrapped-stat-card">
          <span>Plans tracked</span>
          <strong>{plannerRows.length}</strong>
          <small>{donePlans} booked / confirmed / done</small>
        </article>
        <article className="wrapped-stat-card">
          <span>Settlements completed</span>
          <strong>{completedSettlements}</strong>
          <small>payment records closed</small>
        </article>
        <article className="wrapped-stat-card">
          <span>{days ? "Average / day" : "Trip days"}</span>
          <strong>{averagePerDay !== null ? formatMoney(averagePerDay, selectedTrip.baseCurrency) : days ?? "—"}</strong>
          <small>{days ? `${days} day${days === 1 ? "" : "s"} in this journey` : "Set trip dates to unlock this"}</small>
        </article>
      </section>

      <section className="wrapped-footer-card">
        <span aria-hidden="true">✦</span>
        <div>
          <strong>Every mile, meal &amp; memory counts.</strong>
          <p>Keep this page as your post-trip snapshot, or jump back into expenses and plans if something still needs updating.</p>
        </div>
        <div className="wrapped-footer-actions">
          <Link className="button secondary" href="/expenses">Expenses</Link>
          <Link className="button primary" href="/planner">Planner</Link>
        </div>
      </section>
    </div>
  );
}
