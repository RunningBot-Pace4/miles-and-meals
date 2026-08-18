import { db } from "@/db";
import { session } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSession, isSystemAdmin } from "@/lib/session";
import { resetUserPasswordSchema } from "@/lib/validation";
import { setMustChangePassword } from "@/lib/user-preferences";
import { eq } from "drizzle-orm";

type SetUserPasswordInput = {
  headers: Headers;
  body: {
    userId: string;
    newPassword: string;
  };
};

type SetUserPasswordApi = {
  setUserPassword(input: SetUserPasswordInput): Promise<unknown>;
};

function getAdminApi(): SetUserPasswordApi {
  return auth.api as unknown as SetUserPasswordApi;
}

export async function POST(request: Request) {
  const currentSession = await getSession();

  if (!currentSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(currentSession.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = resetUserPasswordSchema.parse(await request.json());

    await getAdminApi().setUserPassword({
      headers: request.headers,
      body: {
        userId: input.userId,
        newPassword: input.newPassword,
      },
    });

    await setMustChangePassword(input.userId, true);
    await db.delete(session).where(eq(session.userId, input.userId));

    return Response.json({
      ok: true,
      message:
        "Temporary password set. The user must create a private password after signing in.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reset password.";

    return Response.json({ error: message }, { status: 400 });
  }
}
