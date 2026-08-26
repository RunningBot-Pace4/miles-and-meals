import { describe, expect, it } from "vitest";
import { buildCompanionSuggestions } from "@/lib/trip-companion";
import { analyzeDayRoute, dayRouteUrl, suggestedDayOrder, type SmartRouteItem } from "@/lib/smart-route";
import { tripDocumentSchema, tripMemorySchema, tripPermissionSchema } from "@/lib/validation";

const tripId = "11111111-1111-4111-8111-111111111111";

function routeItem(input: Partial<SmartRouteItem> & Pick<SmartRouteItem, "id" | "title">): SmartRouteItem {
  return {
    itemDate: "2026-09-10",
    itemTime: null,
    area: null,
    durationMinutes: 60,
    sortOrder: 0,
    ...input,
  };
}

describe("v90 market-readiness behavior", () => {
  it("prioritizes actionable safety, budget and settlement guidance", () => {
    const suggestions = buildCompanionSuggestions({
      stage: "AFTER",
      emergencyContactCount: 0,
      documentTypes: [],
      expiringDocumentCount: 1,
      openPackingCount: 0,
      openTaskCount: 2,
      itineraryCount: 1,
      itineraryMissingTimeCount: 1,
      itineraryMissingAreaCount: 1,
      receiptReviewCount: 1,
      forecastOver: true,
      outstandingAmount: 70.5,
      memoryCount: 0,
    });

    expect(suggestions.slice(0, 5).every((item) => item.priority === "NOW")).toBe(true);
    expect(suggestions.map((item) => item.id)).toEqual(expect.arrayContaining(["emergency", "receipts", "budget", "settlement", "memory"]));
  });

  it("orders timed stops, clusters flexible areas and detects an overlap", () => {
    const items = [
      routeItem({ id: "flex-far", title: "Market", area: "Old Town West", sortOrder: 2 }),
      routeItem({ id: "lunch", title: "Lunch", itemTime: "11:30", area: "Riverside", durationMinutes: 60 }),
      routeItem({ id: "museum", title: "Museum", itemTime: "11:00", area: "Central", durationMinutes: 90 }),
      routeItem({ id: "flex-near", title: "Gallery", area: "Riverside Walk", sortOrder: 1 }),
    ];

    expect(suggestedDayOrder(items).map((item) => item.id)).toEqual(["museum", "lunch", "flex-near", "flex-far"]);
    expect(analyzeDayRoute(items, "walking").warnings).toContain("Museum overlaps Lunch.");
    expect(dayRouteUrl(items, "transit")).toContain("travelmode=transit");
  });

  it("validates scoped traveler permissions and private travel files", () => {
    expect(tripPermissionSchema.safeParse({
      tripId,
      userId: "traveler-1",
      canEditPlan: false,
      canAddExpenses: true,
      canViewDocuments: false,
      canAddMemories: true,
    }).success).toBe(true);

    expect(tripDocumentSchema.safeParse({
      tripId,
      title: "Insurance",
      documentType: "INSURANCE",
      documentData: "data:application/pdf;base64,SGVsbG8=",
      externalUrl: "",
      expiryDate: "2027-08-26",
      visibility: "PRIVATE",
    }).success).toBe(true);
    expect(tripDocumentSchema.safeParse({ tripId, title: "Empty", documentType: "OTHER", visibility: "TRIP" }).success).toBe(false);
    expect(tripMemorySchema.safeParse({ tripId, title: "Night market", photoData: "data:image/jpeg;base64,SGVsbG8=" }).success).toBe(true);
  });
});
