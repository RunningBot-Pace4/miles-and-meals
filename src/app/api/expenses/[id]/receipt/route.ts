import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { getSession } from "@/lib/session";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const rows = await db
    .select({
      countryId: expenses.countryId,
      description: expenses.description,
      receiptUrl: expenses.receiptUrl,
    })
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);

  const expense = rows[0];

  if (!expense) {
    return Response.json(
      { error: "Expense not found." },
      { status: 404 },
    );
  }

  if (!(await canAccessCountry(session.user, expense.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!expense.receiptUrl) {
    return Response.json(
      { error: "No receipt is attached to this expense." },
      { status: 404 },
    );
  }

  return Response.json({
    description: expense.description,
    receiptUrl: expense.receiptUrl,
    embedded: expense.receiptUrl.startsWith("data:image/"),
  });
}
