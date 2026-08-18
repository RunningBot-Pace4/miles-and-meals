import { getSession } from "@/lib/session";
import { profilePreferencesSchema } from "@/lib/validation";
import { saveAvatarPreferences } from "@/lib/user-preferences";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = profilePreferencesSchema.parse(await request.json());

    await saveAvatarPreferences(
      session.user.id,
      input.avatarColor,
      input.avatarIcon,
    );

    return Response.json({ ok: true });
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
