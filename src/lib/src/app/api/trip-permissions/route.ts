import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tripMemberPermissions, tripMembers, user } from "@/db/schema";
import { canAccessTrip } from "@/lib/access";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { tripPermissionSchema, uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get("tripId") ?? "";
  if (!uuidSchema.safeParse(tripId).success || !(await canAccessTrip(session.user, tripId))) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  const [capabilities, rows] = await Promise.all([
    getTripCapabilities(session.user, tripId),
    db.select({
      userId: tripMembers.userId,
      name: user.name,
      role: tripMembers.role,
      canEditPlan: tripMemberPermissions.canEditPlan,
      canAddExpenses: tripMemberPermissions.canAddExpenses,
      canViewDocuments: tripMemberPermissions.canViewDocuments,
      canAddMemories: tripMemberPermissions.canAddMemories,
    })
      .from(tripMembers)
      .innerJoin(user, eq(tripMembers.userId, user.id))
      .leftJoin(tripMemberPermissions, and(
        eq(tripMemberPermissions.tripId, tripMembers.tripId),
        eq(tripMemberPermissions.userId, tripMembers.userId),
      ))
      .where(eq(tripMembers.tripId, tripId))
      .orderBy(user.name),
  ]);

  return Response.json({
    canManage: capabilities.canManage,
    members: rows.map((row) => ({
      ...row,
      canEditPlan: row.role === "OWNER" ? true : row.canEditPlan ?? true,
      canAddExpenses: row.role === "OWNER" ? true : row.canAddExpenses ?? true,
      canViewDocuments: row.role === "OWNER" ? true : row.canViewDocuments ?? true,
      canAddMemories: row.role === "OWNER" ? true : row.canAddMemories ?? true,
    })),
  }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = tripPermissionSchema.parse(await request.json());
    const capabilities = await getTripCapabilities(session.user, input.tripId);
    if (!capabilities.canManage) {
      return Response.json({ error: "Only a Trip Owner can change traveler permissions." }, { status: 403 });
    }
    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;
    const membership = await db.select({ role: tripMembers.role }).from(tripMembers).where(and(
      eq(tripMembers.tripId, input.tripId),
      eq(tripMembers.userId, input.userId),
    )).limit(1);
    if (!membership[0]) return Response.json({ error: "Traveler is no longer in this Trip." }, { status: 404 });
    if (membership[0].role === "OWNER") {
      return Response.json({ error: "Trip Owner permissions cannot be restricted." }, { status: 400 });
    }
    await db.insert(tripMemberPermissions).values({
      ...input,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [tripMemberPermissions.tripId, tripMemberPermissions.userId],
      set: {
        canEditPlan: input.canEditPlan,
        canAddExpenses: input.canAddExpenses,
        canViewDocuments: input.canViewDocuments,
        canAddMemories: input.canAddMemories,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save permissions." }, { status: 400 });
  }
}
