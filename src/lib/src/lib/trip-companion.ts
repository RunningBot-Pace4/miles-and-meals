export type CompanionSuggestion = {
  id: string;
  priority: "NOW" | "SOON" | "IDEA";
  title: string;
  detail: string;
  href: string;
  action: string;
};

export type CompanionInput = {
  stage: "BEFORE" | "DURING" | "AFTER" | "CLOSED";
  emergencyContactCount: number;
  documentTypes: string[];
  expiringDocumentCount: number;
  openPackingCount: number;
  openTaskCount: number;
  itineraryCount: number;
  itineraryMissingTimeCount: number;
  itineraryMissingAreaCount: number;
  receiptReviewCount: number;
  forecastOver: boolean;
  outstandingAmount: number;
  memoryCount: number;
};

export function buildCompanionSuggestions(input: CompanionInput): CompanionSuggestion[] {
  const suggestions: CompanionSuggestion[] = [];
  if (!input.emergencyContactCount) suggestions.push({ id: "emergency", priority: "NOW", title: "Add one emergency contact", detail: "Keep insurance assistance, hotel or family contact details available to the whole group and offline.", href: "/documents", action: "Add safety contact" });
  if (input.expiringDocumentCount) suggestions.push({ id: "expiring", priority: "NOW", title: `${input.expiringDocumentCount} document${input.expiringDocumentCount === 1 ? " expires" : "s expire"} soon`, detail: "Review the expiry date before departure.", href: "/documents", action: "Review documents" });
  if (input.stage === "BEFORE" && !input.documentTypes.includes("INSURANCE")) suggestions.push({ id: "insurance", priority: "SOON", title: "Insurance is not saved", detail: "Add the assistance details or a private policy copy before departure.", href: "/documents", action: "Add insurance" });
  if (input.stage === "BEFORE" && input.openPackingCount) suggestions.push({ id: "packing", priority: "SOON", title: `${input.openPackingCount} packing item${input.openPackingCount === 1 ? "" : "s"} open`, detail: "Finish the shared packing list before leaving.", href: "/planner", action: "Open packing" });
  if (!input.itineraryCount) suggestions.push({ id: "itinerary", priority: "NOW", title: "Your day plan is empty", detail: "Add at least the arrival, accommodation and first activity.", href: "/planner", action: "Build Plan" });
  else if (input.itineraryMissingTimeCount || input.itineraryMissingAreaCount) suggestions.push({ id: "route-ready", priority: "SOON", title: "Make the route travel-ready", detail: `${input.itineraryMissingTimeCount} activities need a time and ${input.itineraryMissingAreaCount} need an area before route checks can be complete.`, href: "/planner", action: "Complete itinerary" });
  if (input.receiptReviewCount) suggestions.push({ id: "receipts", priority: "NOW", title: `${input.receiptReviewCount} receipt${input.receiptReviewCount === 1 ? " needs" : "s need"} review`, detail: "Confirm OCR amounts before final settlement.", href: "/receipts", action: "Review receipts" });
  if (input.forecastOver) suggestions.push({ id: "budget", priority: "NOW", title: "Spending is forecast above budget", detail: "Check category limits and the daily allowance before the next purchase.", href: "/settings/budgets", action: "Review budget" });
  if ((input.stage === "AFTER" || input.stage === "CLOSED") && input.outstandingAmount > 0.009) suggestions.push({ id: "settlement", priority: "NOW", title: "Settlement is still outstanding", detail: "Review the Smart Settlement plan and record the next full or partial payment.", href: "/settlements", action: "Settle up" });
  if ((input.stage === "AFTER" || input.stage === "CLOSED") && !input.memoryCount) suggestions.push({ id: "memory", priority: "IDEA", title: "Save one Trip memory", detail: "Keep the best story or photo before it disappears into the camera roll.", href: "/memories", action: "Add memory" });
  if (input.openTaskCount) suggestions.push({ id: "tasks", priority: "SOON", title: `${input.openTaskCount} shared task${input.openTaskCount === 1 ? "" : "s"} still open`, detail: "Assign or finish the remaining preparation work.", href: "/planner", action: "Review tasks" });
  return suggestions.sort((left, right) => ["NOW", "SOON", "IDEA"].indexOf(left.priority) - ["NOW", "SOON", "IDEA"].indexOf(right.priority));
}
