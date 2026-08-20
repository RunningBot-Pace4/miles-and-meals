import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(3000),
  keys: z.object({
    p256dh: z.string().min(1).max(1000),
    auth: z.string().min(1).max(1000),
  }),
});

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
    const input = subscriptionSchema.parse(
      await request.json(),
    );

    await db
      .insert(pushSubscriptions)
      .values({
        userId: session.user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent:
          request.headers.get("user-agent"),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: session.user.id,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent:
            request.headers.get("user-agent"),
          updatedAt: new Date(),
        },
      });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Invalid push subscription." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
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
    const input = z
      .object({
        endpoint: z.string().url().max(3000),
      })
      .parse(await request.json());

    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(
            pushSubscriptions.userId,
            session.user.id,
          ),
          eq(
            pushSubscriptions.endpoint,
            input.endpoint,
          ),
        ),
      );

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Invalid subscription request." },
      { status: 400 },
    );
  }
}
