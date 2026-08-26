import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseComments, expenses, user } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { expenseLedgerLockedResponse } from "@/lib/financial-close";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { expenseCommentSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

async function loadExpense(id: string) {
  const rows = await db
    .select({
      id: expenses.id,
      tripId: expenses.tripId,
      countryId: expenses.countryId,
      description: expenses.description,
    })
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_request: Request, context: Context) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const expense = await loadExpense(id);
  if (!expense || !(await canAccessCountry(session.user, expense.countryId))) {
    return Response.json({ error: "Expense not found." }, { status: 404 });
  }

  const comments = await db
    .select({
      id: expenseComments.id,
      body: expenseComments.body,
      userId: expenseComments.userId,
      userName: user.name,
      createdAt: expenseComments.createdAt,
    })
    .from(expenseComments)
    .innerJoin(user, eq(expenseComments.userId, user.id))
    .where(eq(expenseComments.expenseId, id))
    .orderBy(asc(expenseComments.createdAt));

  return Response.json({
    comments: comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const expense = await loadExpense(id);
  if (!expense || !(await canAccessCountry(session.user, expense.countryId))) {
    return Response.json({ error: "Expense not found." }, { status: 404 });
  }

  const locked = await expenseLedgerLockedResponse(expense.tripId);
  if (locked) return locked;

  try {
    const input = expenseCommentSchema.parse(await request.json());
    const created = await db
      .insert(expenseComments)
      .values({ expenseId: id, userId: session.user.id, body: input.body })
      .returning({ id: expenseComments.id, createdAt: expenseComments.createdAt });

    await recordActivity({
      actorUserId: session.user.id,
      action: "COMMENTED",
      entityType: "EXPENSE",
      entityId: id,
      tripId: expense.tripId,
      countryId: expense.countryId,
      summary: `${session.user.name} commented on expense: ${expense.description}`,
    });

    await sendPushToCountry(expense.countryId, session.user.id, "EXPENSES", {
      title: "Expense discussion updated",
      body: `${session.user.name} commented on ${expense.description}.`,
      url: `/expenses/${id}/edit`,
      tag: `expense-comment-${id}`,
    });

    return Response.json({
      comment: {
        id: created[0].id,
        body: input.body,
        userId: session.user.id,
        userName: session.user.name,
        createdAt: created[0].createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to add comment." },
      { status: 400 },
    );
  }
}
