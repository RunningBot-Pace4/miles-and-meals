export const plannerTabs = ["ITINERARY", "PLACE", "FOOD", "SHOPPING", "CHECKLIST", "PACKING"] as const;
export type PlannerTab = typeof plannerTabs[number];
export function plannerTab(value?: string): PlannerTab {
  return plannerTabs.includes(value as PlannerTab) ? value as PlannerTab : "ITINERARY";
}
export function plannerTabUrl(value: PlannerTab): string { return `/planner?tab=${value}`; }
