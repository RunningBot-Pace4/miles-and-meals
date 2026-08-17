import { ExpenseForm } from "@/components/ExpenseForm";
import { listAccessibleCountries } from "@/lib/access";
import { requirePageSession } from "@/lib/session";

export default async function NewExpensePage() {
  const session = await requirePageSession();
  const countries = await listAccessibleCountries(session.user);

  return (
    <div className="stack gap-lg">
      <div className="page-heading expense-page-heading">
        <div>
          <p className="eyebrow">MILES & MEALS · EXPENSES</p>
          <h1>Add a spend</h1>
          <p className="muted">
            Enter the local amount, keep the real exchange rate, then split it with the crew.
          </p>
        </div>
      </div>
      <ExpenseForm countries={countries} />
    </div>
  );
}
