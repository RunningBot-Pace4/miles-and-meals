/** Keep legacy bookmarks working while giving each task one linked destination. */
export function appDestination(href: string, tripId?: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://app.invalid");
  const destinations: Record<string, [string, string?]> = {
    "/expenses": ["/spend"],
    "/settlements": ["/spend", "settlements"],
    "/settings/budgets": ["/spend", "budgets"],
    "/receipts": ["/spend", "review"],
    "/notifications": ["/updates"],
    "/activity": ["/updates", "activity"],
    "/memories": ["/trip-story"],
    "/wrapped": ["/trip-story", "highlights"],
    "/companion": ["/dashboard"],
  };
  const destination = destinations[url.pathname];
  if (destination) {
    url.pathname = destination[0];
    url.searchParams.delete("tab");
    if (destination[1]) url.searchParams.set("tab", destination[1]);
    if (href.split(/[?#]/)[0] === "/companion") url.hash = "attention";
  }
  if (tripId && !url.searchParams.has("tripId")) url.searchParams.set("tripId", tripId);
  return `${url.pathname}${url.search}${url.hash}`;
}
