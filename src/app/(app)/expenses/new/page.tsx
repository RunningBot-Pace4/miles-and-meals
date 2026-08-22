import { ExpenseForm } from "@/components/ExpenseForm";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
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
  const accessibleCountryIds = new Set(
    activeTrip.allCountries.map((country) => country.id),
  );
  const category =
    query.category && allowedCategories.has(query.category)
      ? query.category
      : undefined;

  return (
    <ExpenseForm
      countries={
        activeTrip.allCountries
      }
      activeTripId={
        activeTrip.tripId
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
