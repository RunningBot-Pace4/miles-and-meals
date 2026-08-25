import { and, desc, ilike, inArray, ne, or } from "drizzle-orm";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { db } from "@/db";
import { expenses, travelItems } from "@/db/schema";
import { getActiveTripContext } from "@/lib/active-trip";
import { listActivityForUser } from "@/lib/activity";
import { formatMoney } from "@/lib/money";
import { requirePageSession } from "@/lib/session";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 80);
  const session = await requirePageSession();
  const activeTrip = await getActiveTripContext(session.user);
  const countryIds = activeTrip.allCountries.map((country) => country.id);
  const countryById = new Map(
    activeTrip.allCountries.map((country) => [
      country.id,
      { tripName: country.tripName, baseCurrency: country.baseCurrency },
    ]),
  );

  const pattern = `%${q.replaceAll("%", "").replaceAll("_", "")}%`;
  const [expenseRows, plannerRows, activityRows] =
    q.length < 2 || countryIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db
            .select({
              id: expenses.id,
              countryId: expenses.countryId,
              expenseDate: expenses.expenseDate,
              category: expenses.category,
              description: expenses.description,
              baseCurrency: expenses.baseCurrency,
              convertedAmount: expenses.convertedAmount,
            })
            .from(expenses)
            .where(
              and(
                inArray(expenses.countryId, countryIds),
                or(
                  ilike(expenses.description, pattern),
                  ilike(expenses.category, pattern),
                  ilike(expenses.paymentMethod, pattern),
                  ilike(expenses.notes, pattern),
                ),
              ),
            )
            .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
            .limit(30),
          db
            .select({
              id: travelItems.id,
              countryId: travelItems.countryId,
              itemType: travelItems.itemType,
              title: travelItems.title,
              itemDate: travelItems.itemDate,
              area: travelItems.area,
              provider: travelItems.provider,
              notes: travelItems.notes,
            })
            .from(travelItems)
            .where(
              and(
                inArray(travelItems.countryId, countryIds),
                ne(travelItems.itemType, "BOOKING"),
                or(
                  ilike(travelItems.title, pattern),
                  ilike(travelItems.area, pattern),
                  ilike(travelItems.provider, pattern),
                  ilike(travelItems.notes, pattern),
                ),
              ),
            )
            .orderBy(desc(travelItems.itemDate), desc(travelItems.createdAt))
            .limit(30),
          listActivityForUser(session.user, 160).then((rows) =>
            rows
              .filter((row) =>
                `${row.summary} ${row.actorName ?? ""}`
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .slice(0, 30),
          ),
        ]);

  const totalResults =
    expenseRows.length + plannerRows.length + activityRows.length;

  return (
    <div className="stack gap-lg search-page">
      <div className="page-heading search-page-heading">
        <div>
          <p className="eyebrow">FIND ANYTHING</p>
          <h1>Search your trips</h1>
          <p className="muted">
            Search expenses, plans and shared activity across every trip you can access.
          </p>
        </div>
      </div>

      <form className="travel-search-form" method="get" action="/search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Merchant, place, category…"
          maxLength={80}
          enterKeyHint="search"
          aria-label="Search across your trips"
        />
        <button className="button primary" type="submit">Search</button>
      </form>

      {q.length > 0 && q.length < 2 ? (
        <p className="form-error-banner">Type at least 2 characters to search.</p>
      ) : null}

      {q.length >= 2 ? (
        <div className="search-result-summary">
          <strong>{totalResults}</strong>
          <span>{totalResults === 1 ? "result" : "results"} for “{q}”</span>
        </div>
      ) : null}

      {expenseRows.length > 0 ? (
        <section className="search-result-section">
          <div className="travel-section-heading">
            <div><p className="eyebrow">EXPENSES</p><h2>Money & receipts</h2></div>
            <span>{expenseRows.length}</span>
          </div>
          <div className="search-result-list">
            {expenseRows.map((row) => {
              const trip = countryById.get(row.countryId);
              return (
                <Link className="search-result-row" href={`/expenses/${row.id}/edit`} key={row.id}>
                  <span className="search-result-icon">▤</span>
                  <span className="search-result-copy">
                    <strong>{row.description}</strong>
                    <small>{trip?.tripName ?? "Trip"} · {row.expenseDate} · {row.category}</small>
                  </span>
                  <b>{formatMoney(Number(row.convertedAmount), row.baseCurrency)}</b>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {plannerRows.length > 0 ? (
        <section className="search-result-section">
          <div className="travel-section-heading">
            <div><p className="eyebrow">PLANNER</p><h2>Places & plans</h2></div>
            <span>{plannerRows.length}</span>
          </div>
          <div className="search-result-list">
            {plannerRows.map((row) => (
              <Link className="search-result-row" href="/planner" key={row.id}>
                <span className="search-result-icon">✦</span>
                <span className="search-result-copy">
                  <strong>{row.title}</strong>
                  <small>
                    {countryById.get(row.countryId)?.tripName ?? "Trip"}
                    {row.itemDate ? ` · ${row.itemDate}` : ""}
                    {row.area ? ` · ${row.area}` : ""}
                  </small>
                </span>
                <b>{row.itemType.toLowerCase()}</b>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {activityRows.length > 0 ? (
        <section className="search-result-section">
          <div className="travel-section-heading">
            <div><p className="eyebrow">ACTIVITY</p><h2>Shared changes</h2></div>
            <span>{activityRows.length}</span>
          </div>
          <div className="search-result-list">
            {activityRows.map((row) => (
              <Link className="search-result-row" href="/activity" key={row.id}>
                <span className="search-result-icon">◎</span>
                <span className="search-result-copy">
                  <strong>{row.summary}</strong>
                  <small>{row.actorName ?? "System"}</small>
                </span>
                <b>{row.action.replaceAll("_", " ").toLowerCase()}</b>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {q.length >= 2 && totalResults === 0 ? (
        <section className="planner-empty search-empty">
          <div>⌕</div>
          <h2>No match yet</h2>
          <p>Try a shop name, destination, category or traveler action.</p>
        </section>
      ) : null}
    </div>
  );
}
