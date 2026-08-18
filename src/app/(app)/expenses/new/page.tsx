import { ExpenseForm } from "@/components/ExpenseForm";
import { listAccessibleCountries } from "@/lib/access";
import { requirePageSession } from "@/lib/session";

export default async function NewExpensePage() {
  const session = await requirePageSession();
  const countries = await listAccessibleCountries(session.user);

  return <ExpenseForm countries={countries} />;
}
