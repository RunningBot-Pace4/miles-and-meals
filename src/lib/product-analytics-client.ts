export type ProductEventName =
  | "page_view"
  | "expense_saved"
  | "expense_save_failed"
  | "duplicate_warning"
  | "offline_change_queued"
  | "smart_settlement_viewed"
  | "trip_financials_closed"
  | "trip_financials_reopened"
  | "offline_conflict_reviewed";

export function trackProductEvent(
  eventName: ProductEventName,
  route?: string,
  context?: "web" | "pwa" | "mobile" | "desktop",
): void {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    eventName,
    route: route ?? window.location.pathname,
    context,
  });

  try {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    // Product analytics is intentionally best-effort and never blocks UX.
  }
}
