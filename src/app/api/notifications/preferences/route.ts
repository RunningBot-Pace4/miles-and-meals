import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  notificationPreferences,
  pushSubscriptions,
} from "@/db/schema";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

const preferencesSchema = z.object({
  paymentsEnabled: z.boolean(),
  expensesEnabled: z.boolean(),
  plannerEnabled: z.boolean(),
});

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rows = await db
    .select({
      paymentsEnabled:
        notificationPreferences.paymentsEnabled,
      expensesEnabled:
        notificationPreferences.expensesEnabled,
      plannerEnabled:
        notificationPreferences.plannerEnabled,
    })
    .from(notificationPreferences)
    .where(
      eq(
        notificationPreferences.userId,
        session.user.id,
      ),
    )
    .limit(1);

  const subscriptions = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      eq(
        pushSubscriptions.userId,
        session.user.id,
      ),
    )
    .limit(1);

  return Response.json({
    preferences: rows[0] ?? {
      paymentsEnabled: true,
      expensesEnabled: true,
      plannerEnabled: true,
    },
    subscribed: subscriptions.length > 0,
    configured: Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT,
    ),
    publicKey:
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  });
}

export async function PUT(request: Request) {
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
    const input = preferencesSchema.parse(
      await request.json(),
    );

    await db
      .insert(notificationPreferences)
      .values({
        userId: session.user.id,
        ...input,
      })
      .onConflictDoUpdate({
        target:
          notificationPreferences.userId,
        set: {
          ...input,
          updatedAt: new Date(),
        },
      });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Invalid notification preferences." },
      { status: 400 },
    );
  }
}
