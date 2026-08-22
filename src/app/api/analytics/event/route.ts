import { z } from "zod";
import { db } from "@/db";
import { productEvents } from "@/db/schema";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

const eventNames = [
  "page_view",
  "expense_saved",
  "expense_save_failed",
  "duplicate_warning",
  "offline_change_queued",
  "smart_settlement_viewed",
  "trip_financials_closed",
  "trip_financials_reopened",
  "offline_conflict_reviewed",
] as const;

const eventSchema = z.object({
  eventName: z.enum(eventNames),
  route: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .refine((value) => value.startsWith("/"), "Invalid app route."),
  context: z.enum(["web", "pwa", "mobile", "desktop"]).optional(),
});

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = eventSchema.parse(await request.json());

    await db.insert(productEvents).values({
      eventName: input.eventName,
      route: input.route.split("?")[0].slice(0, 180),
      context: input.context ?? null,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid analytics event." }, { status: 400 });
  }
}
