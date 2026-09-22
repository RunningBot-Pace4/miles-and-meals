import type { ReactNode } from "react";
export function activityIcon(type: string, title = "", category = "") {
  if (type !== "ITINERARY") return type;
  const text = `${category} ${title}`.toLowerCase();
  if (/meal|food|cafe|coffee|breakfast|lunch|dinner|restaurant/.test(text)) return "FOOD";
  if (/shop|market|outlet|souvenir/.test(text)) return "SHOPPING";
  if (/hotel|stay|accommodation|check-in/.test(text)) return "STAY";
  if (/temple|museum|landmark|sight/.test(text)) return "LANDMARK";
  if (/park|garden|nature/.test(text)) return "PLACE";
  return "ITINERARY";
}
export function PlanIcon({ kind, size = 22 }: { kind: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    ITINERARY: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h3m-3 3h7"/></>,
    PLACE: <><path d="M12 3l-5 7h3l-5 7h14l-5-7h3zM12 17v4M8 21h8"/></>,
    FOOD: <><path d="M5 3v7m3-7v7M3 3v5a3 3 0 0 0 6 0V3M6 11v10M18 3c-3 3-3 8 0 9h2V3h-2zm2 9v9"/></>,
    SHOPPING: <><path d="M4 8h16l1 13H3L4 8zM8 8V6a4 4 0 0 1 8 0v2"/></>,
    CHECKLIST: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 2 2 5-5m-7 10h8"/></>,
    PACKING: <><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M9 6V3h6v3M8 10v6m8-6v6M7 20v2m10-2v2"/></>,
    STAY: <><path d="M3 18V6m0 9h18v5m-18 0v-2h18M7 9h3v5H7zM12 9h5a4 4 0 0 1 4 4v2"/></>,
    LANDMARK: <><path d="m3 8 9-5 9 5H3zm2 3v7m7-7v7m7-7v7M3 21h18M4 18h16"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[kind] ?? paths.ITINERARY}</svg>;
}
