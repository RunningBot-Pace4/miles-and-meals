import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  canAccessCountry,
  listCountryMembers,
} from "@/lib/access";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!(await canAccessCountry(session.user, id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await listCountryMembers(id, session.user.id);
  return Response.json({ members });
}
