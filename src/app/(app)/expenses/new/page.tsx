import { ExpenseForm } from "@/components/ExpenseForm";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { requirePageSession } from "@/lib/session";

export default async function NewExpensePage() {
  const session =
    await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );

  return (
    <ExpenseForm
      countries={
        activeTrip.countries
      }
      currentUserId={
        session.user.id
      }
    />
  );
}
