import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import { auth } from "@/lib/auth";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession, isSystemAdmin } from "@/lib/session";
import { createUserSchema } from "@/lib/validation";
import { setMustChangePassword } from "@/lib/user-preferences";

type AdminCreateUserInput = {
  headers: Headers;
  body: {
    name: string;
    email: string;
    password: string;
    role: string;
  };
};

type AdminCreateUserApi = {
  createUser(input: AdminCreateUserInput): Promise<unknown>;
};

function getAdminApi(): AdminCreateUserApi {
  return auth.api as unknown as AdminCreateUserApi;
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = createUserSchema.parse(await request.json());

    const created = await getAdminApi().createUser({
      headers: await headers(),
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: "user",
      },
    });

    const createdRows = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1);

    if (createdRows[0]) {
      await setMustChangePassword(createdRows[0].id, true);

      await recordActivity({
        actorUserId: session.user.id,
        action: "CREATED",
        entityType: "USER",
        entityId: createdRows[0].id,
        summary: `${session.user.name} created traveler account ${input.email}.`,
      });
    }

    return Response.json({ user: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create user.";

    return Response.json({ error: message }, { status: 400 });
  }
}
