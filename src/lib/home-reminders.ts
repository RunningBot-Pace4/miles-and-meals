import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, travelItems, tripDocuments, tripEmergencyContacts, tripMemories } from "@/db/schema";
import type { SessionUser } from "@/lib/access";
import { buildCompanionSuggestions } from "@/lib/trip-companion";
import { getTripCapabilities } from "@/lib/trip-capabilities";

/** Country IDs must come from the authenticated user's accessible trip context. */
export async function loadHomeReminders(user: SessionUser, tripId: string, countryIds: string[], stage: "BEFORE" | "DURING" | "AFTER" | "CLOSED", forecastOver: boolean) {
  if (!tripId || !countryIds.length) return [];
  const capabilities = await getTripCapabilities(user, tripId);
  const [plan, documents, contacts, memories, receipts] = await Promise.all([
    db.select().from(travelItems).where(inArray(travelItems.countryId, countryIds)),
    capabilities.canViewDocuments ? db.select({ documentType: tripDocuments.documentType, expiryDate: tripDocuments.expiryDate }).from(tripDocuments).where(and(eq(tripDocuments.tripId, tripId), or(eq(tripDocuments.visibility, "TRIP"), eq(tripDocuments.createdBy, user.id)))) : Promise.resolve([]),
    db.select({ id: tripEmergencyContacts.id }).from(tripEmergencyContacts).where(eq(tripEmergencyContacts.tripId, tripId)).limit(1),
    db.select({ id: tripMemories.id }).from(tripMemories).where(eq(tripMemories.tripId, tripId)).limit(1),
    db.select({ id: expenses.id }).from(expenses).where(and(inArray(expenses.countryId, countryIds), ne(expenses.receiptReviewStatus, "REVIEWED"), sql`${expenses.receiptUrl} is not null`)),
  ]);
  const itinerary = plan.filter(item => item.itemType === "ITINERARY");
  const open = (type: string) => plan.filter(item => item.itemType === type && item.status !== "Done").length;
  return buildCompanionSuggestions({
    stage, emergencyContactCount: contacts.length, documentTypes: documents.map(item => item.documentType),
    expiringDocumentCount: documents.filter(item => { const remaining = item.expiryDate ? new Date(`${item.expiryDate}T00:00:00Z`).getTime() - Date.now() : -1; return remaining >= 0 && remaining <= 45 * 86_400_000; }).length,
    openPackingCount: open("PACKING"), openTaskCount: open("CHECKLIST"), itineraryCount: itinerary.length,
    itineraryMissingTimeCount: itinerary.filter(item => !item.itemTime).length,
    itineraryMissingAreaCount: itinerary.filter(item => !item.area).length,
    receiptReviewCount: receipts.length, forecastOver, outstandingAmount: 0, memoryCount: memories.length,
  }).filter(item => capabilities.canViewDocuments || !["emergency", "insurance", "expiring"].includes(item.id))
    .filter(item => stage !== "CLOSED" || ["expiring", "memory"].includes(item.id));
}
