import { ExpenseForm } from "@/components/ExpenseForm";
import { FinancialClosePanel } from "@/components/FinancialClosePanel";
import { FullPageLink as Link } from "@/components/FullPageLink";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { getTripFinancialState } from "@/lib/financial-close";
import { canManageTrip } from "@/lib/trip-management";
import { requirePageSession } from "@/lib/session";

const allowedCategories = new Set([
  "Food",
  "Transport",
  "Hotel",
  "Shopping",
  "Attractions",
  "Flights",
  "Other",
]);

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{
    countryId?: string;
    date?: string;
    description?: string;
    category?: string;
  }>;
}) {
  const query = await searchParams;
  const session =
    await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const openCountries = activeTrip.allCountries.filter(
    (country) => country.financialStatus !== "CLOSED",
  );
  const accessibleCountryIds = new Set(
    openCountries.map((country) => country.id),
  );
  const category =
    query.category && allowedCategories.has(query.category)
      ? query.category
      : undefined;
  const [financialState, canManageFinancials] = await Promise.all([
    getTripFinancialState(activeTrip.tripId),
    activeTrip.tripId ? canManageTrip(session.user, activeTrip.tripId) : Promise.resolve(false),
  ]);

  if (openCountries.length === 0 && financialState?.status === "CLOSED") {
    return (
      <div className="stack gap-lg">
        <div className="page-heading">
          <div>
            <p className="eyebrow">MONEY · FINAL SETTLEMENT</p>
            <h1>Add a spend</h1>
            <p className="muted">This trip is locked for final settlement, so new expense changes are paused.</p>
          </div>
          <Link className="button secondary" href="/settlements">Back to settlement</Link>
        </div>
        <FinancialClosePanel
          initialState={financialState}
          canManage={canManageFinancials}
        />
      </div>
    );
  }

  return (
    <ExpenseForm
      countries={
        openCountries
      }
      activeTripId={
        openCountries.some((country) => country.tripId === activeTrip.tripId)
          ? activeTrip.tripId
          : openCountries[0]?.tripId ?? ""
      }
      currentUserId={
        session.user.id
      }
      prefill={{
        countryId:
          query.countryId && accessibleCountryIds.has(query.countryId)
            ? query.countryId
            : undefined,
        expenseDate:
          query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
            ? query.date
            : undefined,
        description: query.description?.slice(0, 250),
        category,
      }}
    />
  );
}
