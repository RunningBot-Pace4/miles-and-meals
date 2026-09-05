import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";
import { adminUserRoleSchema } from "@/lib/validation";

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

  if (!isSystemAdmin(session.user.role)) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input =
      adminUserRoleSchema.parse(
        await request.json(),
      );

    if (
      input.userId === session.user.id &&
      input.role !== "admin"
    ) {
      return Response.json(
        {
          error:
            "You cannot remove your own Admin access.",
        },
        { status: 400 },
      );
    }

    const targetRows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1);

    const target = targetRows[0];

    if (!target) {
      return Response.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    if (
      (target.role ?? "user") ===
      input.role
    ) {
      return Response.json({
        ok: true,
        role: input.role,
      });
    }

    await db
      .update(user)
      .set({
        role: input.role,
        updatedAt: new Date(),
      })
      .where(eq(user.id, input.userId));

    await recordActivity({
      actorUserId: session.user.id,
      action: "UPDATED_ROLE",
      entityType: "USER",
      entityId: target.id,
      summary:
        `${session.user.name} changed ${target.name} ` +
        `(${target.email}) to ${input.role}.`,
      metadata: {
        previousRole:
          target.role ?? "user",
        role: input.role,
      },
    });

    return Response.json({
      ok: true,
      role: input.role,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update user type.",
      },
      { status: 400 },
    );
  }
}
