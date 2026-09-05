import { FullPageLink as Link } from "@/components/FullPageLink";
import { FinancialClosePanel } from "@/components/FinancialClosePanel";
import { LiveSettlementWorkspace } from "@/components/LiveSettlementWorkspace";
import { SettlementTripSelect } from "@/components/SettlementTripSelect";
import { getActiveTripContext } from "@/lib/active-trip";
import { buildExpenseSummary } from "@/lib/dashboard";
import { getTripFinancialState } from "@/lib/financial-close";
import { canManageTrip } from "@/lib/trip-management";
import { requirePageSession } from "@/lib/session";
import { serializeSettlementLiveData } from "@/lib/settlement-live";

type SettlementsPageProps = {
  searchParams: Promise<{
    tripId?: string;
    country?: string;
  }>;
};

type TripOption = {
  id: string;
  name: string;
  baseCurrency: string;
  startDate: string | null;
  endDate: string | null;
  financialStatus: string;
  financialVersion: number;
};

function malaysiaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function tripEndedAtLeastOneDayAgo(endDate: string | null | undefined): boolean {
  if (!endDate) {
    return false;
  }

  const today = malaysiaDateString();

  if (endDate >= today) {
    return false;
  }

  const end = new Date(`${endDate}T00:00:00+08:00`).getTime();
  const now = new Date(`${today}T00:00:00+08:00`).getTime();
  return now - end >= 24 * 60 * 60 * 1000;
}

function settlementStatus(trip: TripOption): {
  label: string;
  className: string;
} {
  if (trip.financialStatus === "CLOSED") {
    return { label: `Locked · v${Math.max(1, trip.financialVersion)}`, className: "locked" };
  }

  const today = malaysiaDateString();

  if (tripEndedAtLeastOneDayAgo(trip.endDate)) {
    return { label: "Ready to lock", className: "ready" };
  }

  if (trip.startDate && trip.startDate > today) {
    return { label: "Upcoming", className: "upcoming" };
  }

  if (trip.startDate || trip.endDate) {
    return { label: "In progress", className: "progress" };
  }

  return { label: "Expenses open", className: "open" };
}

function formatTripDates(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) {
    return "Dates not set";
  }

  const format = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(parsed);
  };

  if (startDate && endDate) {
    return `${format(startDate)} – ${format(endDate)}`;
  }

  return format(startDate ?? endDate ?? "");
}

export default async function SettlementsPage({
  searchParams,
}: SettlementsPageProps) {
  const session = await requirePageSession();
  const context = await getActiveTripContext(session.user);
  const query = await searchParams;

  const requestedTripId = query.tripId ?? "";
  const legacyCountry = query.country
    ? context.allCountries.find((country) => country.id === query.country)
    : null;
  const legacyTripId = legacyCountry?.tripId ?? "";
  const selectedTripId =
    context.trips.some((trip) => trip.id === requestedTripId)
      ? requestedTripId
      : context.trips.some((trip) => trip.id === legacyTripId)
        ? legacyTripId
        : context.tripId || context.trips[0]?.id || "";
  const selectedTrip = context.trips.find((trip) => trip.id === selectedTripId) ?? null;
  const selectedCountries = context.allCountries.filter(
    (country) => country.tripId === selectedTripId,
  );
  const selectedCountryId = selectedCountries[0]?.id ?? "";

  const summary = await buildExpenseSummary(
    selectedCountries.map((country) => country.id),
  );
  const baseCurrency = selectedTrip?.baseCurrency ?? selectedCountries[0]?.baseCurrency ?? "MYR";
  const initialData = serializeSettlementLiveData(summary, baseCurrency);
  const [financialState, canManageFinancials] = selectedTripId
    ? await Promise.all([
        getTripFinancialState(selectedTripId),
        canManageTrip(session.user, selectedTripId),
      ])
    : [null, false] as const;
  const selectedStatus = selectedTrip ? settlementStatus(selectedTrip) : null;
  const selectedDestination = selectedCountries[0]?.name ?? "Destination not set";

  return (
    <div className="stack gap-lg settle-page">
      <div className="page-heading settlement-page-heading">
        <div>
          <p className="eyebrow">MONEY BETWEEN FRIENDS</p>
          <h1>Settle Up</h1>
          <p className="muted">
            Choose a trip and it opens instantly. Balances come directly from expenses,
            personal shares and confirmed payment history.
          </p>
        </div>

        <Link className="button settlement-action-secondary" href="/expenses">
          View expenses
        </Link>
      </div>

      {context.trips.length ? (
        <section className="panel settle-filter-panel">
          <SettlementTripSelect
            trips={context.trips.map((trip) => ({
              id: trip.id,
              name: trip.name,
              statusLabel: settlementStatus(trip).label,
            }))}
            selectedId={selectedTripId}
            activeTripId={context.tripId}
          />

          {selectedTrip && selectedStatus ? (
            <div className="settlement-trip-context" aria-label="Selected settlement trip">
              <div className="settlement-trip-context-main">
                <span className="settlement-trip-context-icon" aria-hidden="true">✦</span>
                <div>
                  <small>Selected trip</small>
                  <strong>{selectedTrip.name}</strong>
                  <span>{selectedDestination} · {formatTripDates(selectedTrip.startDate, selectedTrip.endDate)}</span>
                </div>
              </div>
              <div className="settlement-trip-context-meta">
                <span>
                  <small>Currency</small>
                  <strong>{selectedTrip.baseCurrency}</strong>
                </span>
                <span className={`settlement-readiness ${selectedStatus.className}`}>
                  {selectedStatus.label}
                </span>
              </div>
            </div>
          ) : null}

          <p className="settlement-trip-picker-note">
            Trips that have already ended are marked <strong>Ready to lock</strong>. You can still review
            balances before locking, and the Trip Owner decides when everyone has finished adding expenses.
          </p>
        </section>
      ) : null}

      {financialState ? (
        <FinancialClosePanel initialState={financialState} canManage={canManageFinancials} />
      ) : null}

      <LiveSettlementWorkspace
        initialData={initialData}
        currentUserId={session.user.id}
        countryId={selectedCountries.length === 1 ? selectedCountryId : ""}
        tripId={selectedCountries.length === 1 ? "" : selectedTripId}
        variant="settlements"
      />
    </div>
  );
}
