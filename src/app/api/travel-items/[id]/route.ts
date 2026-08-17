import { eq } from "drizzle-orm";
import { db } from "@/db";
import { travelItems } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { getSession } from "@/lib/session";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const rows = await db
    .select({ countryId: travelItems.countryId })
    .from(travelItems)
    .where(eq(travelItems.id, id))
    .limit(1);

  if (!rows[0]) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await canAccessCountry(session.user, rows[0].countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(travelItems).where(eq(travelItems.id, id));
  return Response.json({ ok: true });
}
