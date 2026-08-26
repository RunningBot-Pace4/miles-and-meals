import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { expenseLedgerLockedResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const rows = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  const expense = rows[0];
  if (!expense || !(await canAccessCountry(session.user, expense.countryId))) {
    return Response.json({ error: "Expense not found." }, { status: 404 });
  }
  const locked = await expenseLedgerLockedResponse(expense.tripId);
  if (locked) return locked;
  await db.update(expenses).set({
    receiptReviewStatus: "REVIEWED",
    receiptReviewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(expenses.id, id));
  return Response.json({ ok: true });
}
