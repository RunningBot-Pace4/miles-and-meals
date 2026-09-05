import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { splitPresets } from "@/db/schema";
import { canAccessTrip } from "@/lib/access";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { splitPresetSchema, uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get("tripId") ?? "";
  if (!uuidSchema.safeParse(tripId).success || !(await canAccessTrip(session.user, tripId))) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(splitPresets)
    .where(eq(splitPresets.tripId, tripId));

  return Response.json({
    presets: rows.map((row) => ({
      id: row.id,
      name: row.name,
      splitMode: row.splitMode,
      shares: JSON.parse(row.sharesJson) as Array<{ userId: string; value: number }>,
    })),
  });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = splitPresetSchema.parse(await request.json());
    if (!(await canAccessTrip(session.user, input.tripId))) {
      return Response.json({ error: "Trip not found." }, { status: 404 });
    }
    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;

    const created = await db
      .insert(splitPresets)
      .values({
        tripId: input.tripId,
        name: input.name,
        splitMode: input.splitMode,
        sharesJson: JSON.stringify(input.shares),
        createdBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: [splitPresets.tripId, splitPresets.name],
        set: {
          splitMode: input.splitMode,
          sharesJson: JSON.stringify(input.shares),
          createdBy: session.user.id,
        },
      })
      .returning({ id: splitPresets.id });

    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save split preset." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as { id?: string; tripId?: string } | null;
  const id = payload?.id ?? "";
  const tripId = payload?.tripId ?? "";
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(tripId).success) {
    return Response.json({ error: "Invalid preset." }, { status: 400 });
  }
  if (!(await canAccessTrip(session.user, tripId))) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }
  const locked = await closedTripReadOnlyResponse(tripId);
  if (locked) return locked;

  await db.delete(splitPresets).where(and(eq(splitPresets.id, id), eq(splitPresets.tripId, tripId)));
  return Response.json({ ok: true });
}
