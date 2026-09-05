import {
  eq,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  session,
  user,
} from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";

const statusSchema = z.object({
  userId: z.string().min(1),
  disabled: z.boolean(),
});

export async function POST(
  request: Request,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const current =
    await getSession();

  if (!current) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (
    !isSystemAdmin(
      current.user.role,
    )
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input =
      statusSchema.parse(
        await request.json(),
      );

    if (
      input.userId ===
        current.user.id &&
      input.disabled
    ) {
      return Response.json(
        {
          error:
            "You cannot disable your own Admin account.",
        },
        { status: 400 },
      );
    }

    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        banned: user.banned,
      })
      .from(user)
      .where(
        eq(
          user.id,
          input.userId,
        ),
      )
      .limit(1);

    const target = rows[0];

    if (!target) {
      return Response.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    await db
      .update(user)
      .set({
        banned: input.disabled,
        banReason: input.disabled
          ? "Disabled by Miles & Meals Admin"
          : null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(
        eq(
          user.id,
          input.userId,
        ),
      );

    if (input.disabled) {
      await db
        .delete(session)
        .where(
          eq(
            session.userId,
            input.userId,
          ),
        );
    }

    await recordActivity({
      actorUserId:
        current.user.id,
      action: input.disabled
        ? "DISABLED"
        : "REACTIVATED",
      entityType: "USER",
      entityId: target.id,
      summary: `${
        current.user.name
      } ${
        input.disabled
          ? "disabled"
          : "reactivated"
      } ${target.name} (${target.email}).`,
    });

    return Response.json({
      ok: true,
      disabled: input.disabled,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update account status.",
      },
      { status: 400 },
    );
  }
}
