import { getSession } from "@/lib/session";
import { setMustChangePassword } from "@/lib/user-preferences";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await setMustChangePassword(session.user.id, false);
  return Response.json({ ok: true });
}
