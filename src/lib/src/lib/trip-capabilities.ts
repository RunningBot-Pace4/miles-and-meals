import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tripMemberPermissions, tripMembers, trips } from "@/db/schema";
import type { SessionUser } from "@/lib/access";
import { isSystemAdmin } from "@/lib/session";
import { isTripOwnerRole } from "@/lib/trip-roles";

export type TripCapabilities = {
  canAccess: boolean;
  canManage: boolean;
  canEditPlan: boolean;
  canAddExpenses: boolean;
  canViewDocuments: boolean;
  canAddMemories: boolean;
};

const none: TripCapabilities = {
  canAccess: false,
  canManage: false,
  canEditPlan: false,
  canAddExpenses: false,
  canViewDocuments: false,
  canAddMemories: false,
};

export async function getTripCapabilities(
  currentUser: SessionUser,
  tripId: string,
): Promise<TripCapabilities> {
  const [tripRows, membershipRows, permissionRows] = await Promise.all([
    db.select({ createdBy: trips.createdBy }).from(trips).where(eq(trips.id, tripId)).limit(1),
    db.select({ role: tripMembers.role }).from(tripMembers).where(and(
      eq(tripMembers.tripId, tripId),
      eq(tripMembers.userId, currentUser.id),
    )).limit(1),
    db.select().from(tripMemberPermissions).where(and(
      eq(tripMemberPermissions.tripId, tripId),
      eq(tripMemberPermissions.userId, currentUser.id),
    )).limit(1),
  ]);

  const trip = tripRows[0];
  const membership = membershipRows[0];
  if (!trip || !membership) return none;

  const canManage = isSystemAdmin(currentUser.role) ||
    trip.createdBy === currentUser.id ||
    isTripOwnerRole(membership.role);
  if (canManage) {
    return {
      canAccess: true,
      canManage: true,
      canEditPlan: true,
      canAddExpenses: true,
      canViewDocuments: true,
      canAddMemories: true,
    };
  }

  const permission = permissionRows[0];
  return {
    canAccess: true,
    canManage: false,
    canEditPlan: permission?.canEditPlan ?? true,
    canAddExpenses: permission?.canAddExpenses ?? true,
    canViewDocuments: permission?.canViewDocuments ?? true,
    canAddMemories: permission?.canAddMemories ?? true,
  };
}
