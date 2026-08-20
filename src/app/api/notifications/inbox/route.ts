import {
  and,
  desc,
  eq,
  isNull,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

const markSchema = z.union([
  z.object({
    all: z.literal(true),
  }),
  z.object({
    id: z.string().uuid(),
  }),
]);

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const [items, unreadRows] =
    await Promise.all([
      db
        .select({
          id: notifications.id,
          category:
            notifications.category,
          title: notifications.title,
          body: notifications.body,
          url: notifications.url,
          readAt: notifications.readAt,
          createdAt:
            notifications.createdAt,
        })
        .from(notifications)
        .where(
          eq(
            notifications.userId,
            session.user.id,
          ),
        )
        .orderBy(
          desc(
            notifications.createdAt,
          ),
        )
        .limit(100),
      db
        .select({
          id: notifications.id,
        })
        .from(notifications)
        .where(
          and(
            eq(
              notifications.userId,
              session.user.id,
            ),
            isNull(
              notifications.readAt,
            ),
          ),
        ),
    ]);

  return Response.json(
    {
      unreadCount:
        unreadRows.length,
      items: items.map((item) => ({
        ...item,
        readAt:
          item.readAt?.toISOString() ??
          null,
        createdAt:
          item.createdAt.toISOString(),
      })),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export async function POST(
  request: Request,
) {
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
    const input = markSchema.parse(
      await request.json(),
    );
    const now = new Date();

    if ("all" in input) {
      await db
        .update(notifications)
        .set({
          readAt: now,
        })
        .where(
          and(
            eq(
              notifications.userId,
              session.user.id,
            ),
            isNull(
              notifications.readAt,
            ),
          ),
        );
    } else {
      await db
        .update(notifications)
        .set({
          readAt: now,
        })
        .where(
          and(
            eq(
              notifications.id,
              input.id,
            ),
            eq(
              notifications.userId,
              session.user.id,
            ),
          ),
        );
    }

    return Response.json({
      ok: true,
      readAt: now.toISOString(),
    });
  } catch {
    return Response.json(
      {
        error:
          "Invalid notification update.",
      },
      { status: 400 },
    );
  }
}
