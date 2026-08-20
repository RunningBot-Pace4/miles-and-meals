import { FullPageLink as Link } from "@/components/FullPageLink";
import { LiveSettlementWorkspace } from "@/components/LiveSettlementWorkspace";
import { listAccessibleCountries } from "@/lib/access";
import { buildExpenseSummary } from "@/lib/dashboard";
import { requirePageSession } from "@/lib/session";
import { serializeSettlementLiveData } from "@/lib/settlement-live";

type SettlementsPageProps = {
  searchParams: Promise<{
    country?: string;
  }>;
};

export default async function SettlementsPage({
  searchParams,
}: SettlementsPageProps) {
  const session =
    await requirePageSession();
  const countries =
    await listAccessibleCountries(
      session.user,
    );
  const query = await searchParams;

  const selectedId =
    query.country &&
    countries.some(
      (country) =>
        country.id === query.country,
    )
      ? query.country
      : "";

  const selectedCountries =
    selectedId
      ? countries.filter(
          (country) =>
            country.id ===
            selectedId,
        )
      : countries;

  const summary =
    await buildExpenseSummary(
      selectedCountries.map(
        (country) => country.id,
      ),
    );

  const baseCurrency =
    selectedCountries[0]
      ?.baseCurrency ?? "MYR";

  const initialData =
    serializeSettlementLiveData(
      summary,
      baseCurrency,
    );

  return (
    <div className="stack gap-lg settle-page">
      <div className="page-heading settlement-page-heading">
        <div>
          <p className="eyebrow">
            MONEY BETWEEN FRIENDS
          </p>
          <h1>Settle Up</h1>
          <p className="muted">
            No manual amount entry.
            Balances come directly from
            expenses, personal shares and
            confirmed payment history.
          </p>
        </div>

        <Link
          className="button settlement-action-secondary"
          href="/expenses"
        >
          View expenses
        </Link>
      </div>

      {countries.length ? (
        <section className="panel settle-filter-panel">
          <form className="settle-country-filter">
            <label>
              Trip / country
              <select
                defaultValue={
                  selectedId
                }
                name="country"
              >
                <option value="">
                  All trips
                </option>
                {countries.map(
                  (country) => (
                    <option
                      value={
                        country.id
                      }
                      key={
                        country.id
                      }
                    >
                      {
                        country.tripName
                      }{" "}
                      · {country.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <button
              className="button primary"
              type="submit"
            >
              View
            </button>
          </form>
        </section>
      ) : null}

      <LiveSettlementWorkspace
        initialData={initialData}
        currentUserId={
          session.user.id
        }
        countryId={selectedId}
        variant="settlements"
      />
    </div>
  );
}
