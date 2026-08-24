import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { profilePreferencesSchema } from "@/lib/validation";
import { saveAvatarPreferences, saveRegionalPreferences } from "@/lib/user-preferences";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const input =
      profilePreferencesSchema.parse(
        await request.json(),
      );

    await db
      .update(user)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(
        eq(user.id, session.user.id),
      );

    await saveAvatarPreferences(
      session.user.id,
      input.avatarColor,
      input.avatarIcon,
    );
    await saveRegionalPreferences(
      session.user.id,
      input.locale,
      input.timeZone,
    );

    return Response.json({
      ok: true,
      name: input.name,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update profile.",
      },
      { status: 400 },
    );
  }
}
