import { eq } from "drizzle-orm";
import { db } from "@/db";
import { travelItems } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { getSession } from "@/lib/session";
import { travelItemSchema } from "@/lib/validation";

type Context = {
  params: Promise<{ id: string }>;
};

async function getExistingItem(id: string) {
  const rows = await db
    .select({
      id: travelItems.id,
      countryId: travelItems.countryId,
    })
    .from(travelItems)
    .where(eq(travelItems.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function PATCH(request: Request, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = await getExistingItem(id);

    if (!existing) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    if (!(await canAccessCountry(session.user, existing.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = travelItemSchema.parse(await request.json());

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json(
        { error: "You do not have access to the selected country." },
        { status: 403 },
      );
    }

    await db
      .update(travelItems)
      .set({
        countryId: input.countryId,
        itemType: input.itemType,
        title: input.title,
        itemDate: input.itemDate || null,
        itemTime: input.itemTime || null,
        area: input.area || null,
        subtype: input.subtype || null,
        priority: input.priority || null,
        status: input.status || null,
        ownerUserId: input.ownerUserId || null,
        estimatedCost:
          input.estimatedCost === "" ||
          input.estimatedCost === null ||
          input.estimatedCost === undefined
            ? null
            : Number(input.estimatedCost).toFixed(2),
        quantity:
          input.quantity === "" ||
          input.quantity === null ||
          input.quantity === undefined
            ? null
            : Number(input.quantity).toFixed(2),
        provider: input.provider || null,
        confirmationNo: input.confirmationNo || null,
        linkUrl: input.linkUrl || null,
        notes: input.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(travelItems.id, id));

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update item.";

    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getExistingItem(id);

  if (!existing) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await canAccessCountry(session.user, existing.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(travelItems).where(eq(travelItems.id, id));

  return Response.json({ ok: true });
}
