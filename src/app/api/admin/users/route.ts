import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession, isSystemAdmin } from "@/lib/session";
import { createUserSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = createUserSchema.parse(await request.json());

    const created = await auth.api.createUser({
      headers: await headers(),
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: "user",
      },
    });

    return Response.json({ user: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create user.";
    return Response.json({ error: message }, { status: 400 });
  }
}
