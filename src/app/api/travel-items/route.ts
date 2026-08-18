import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { travelItems, user } from "@/db/schema";
import { canAccessCountry, listAccessibleCountries } from "@/lib/access";
import { getSession } from "@/lib/session";
import { travelItemSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const countries = await listAccessibleCountries(session.user);
  const ids = countries.map((country) => country.id);

  if (ids.length === 0) {
    return Response.json({ items: [] });
  }

  const items = await db
    .select({
      id: travelItems.id,
      countryId: travelItems.countryId,
      itemType: travelItems.itemType,
      title: travelItems.title,
      itemDate: travelItems.itemDate,
      itemTime: travelItems.itemTime,
      area: travelItems.area,
      subtype: travelItems.subtype,
      priority: travelItems.priority,
      status: travelItems.status,
      ownerUserId: travelItems.ownerUserId,
      estimatedCost: travelItems.estimatedCost,
      quantity: travelItems.quantity,
      provider: travelItems.provider,
      confirmationNo: travelItems.confirmationNo,
      linkUrl: travelItems.linkUrl,
      notes: travelItems.notes,
      createdBy: travelItems.createdBy,
      proposedByName: user.name,
    })
    .from(travelItems)
    .leftJoin(user, eq(travelItems.createdBy, user.id))
    .where(inArray(travelItems.countryId, ids))
    .orderBy(desc(travelItems.itemDate), desc(travelItems.createdAt));

  return Response.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = travelItemSchema.parse(await request.json());

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const created = await db
      .insert(travelItems)
      .values({
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
        createdBy: session.user.id,
      })
      .returning({ id: travelItems.id });

    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save item.";

    return Response.json({ error: message }, { status: 400 });
  }
}
