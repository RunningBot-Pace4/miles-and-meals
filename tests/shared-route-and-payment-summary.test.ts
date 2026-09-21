import { describe, expect, it } from "vitest";
import { resolveRoutePins, routePinKey } from "../src/lib/saved-route";
import { paymentStatusSummary } from "../src/lib/payment-status-summary";
const start = { latitude: 22.28, longitude: 114.19 };
const end = { latitude: 22.3, longitude: 114.17 };
const items = [
  { id: "stay", countryId: "hk", itemType: "ITINERARY", subtype: "Accommodation", linkUrl: "https://maps.google.com/?q=22.28,114.19", notes: null },
  { id: "place", countryId: "hk", itemType: "PLACE", subtype: null, linkUrl: "https://maps.google.com/?q=22.3,114.17", notes: null },
];
describe("saved route identity", () => {
  it("resolves exact saved endpoints within the selected trip", () => {
    expect(resolveRoutePins(items, "hk", "stay", "place")).toEqual({ start, end });
    expect(resolveRoutePins(items, "other", "stay", "place")).toBeNull();
    expect(resolveRoutePins(items, "hk", "place", "stay")).toBeNull();
  });
  it("invalidates a result when either endpoint or travel mode changes", () => {
    const key = routePinKey(start, end, "walk");
    expect(routePinKey({ ...start, latitude: 22.29 }, end, "walk")).not.toBe(key);
    expect(routePinKey(start, { ...end, longitude: 114.18 }, "walk")).not.toBe(key);
    expect(routePinKey(start, end, "drive")).not.toBe(key);
  });
  it("does not infer coordinates from a place name", () => {
    expect(resolveRoutePins([items[0], { ...items[1], linkUrl: "https://maps.google.com/?q=Temple+Street" }], "hk", "stay", "place")).toBeNull();
  });
});
describe("payment status summary", () => {
  const payment = { id: "one", currency: "MYR", amount: 45, status: "SENT", fromUserId: "me", toUserId: "other" };
  it("reserves pending payments separately from confirmed money", () => {
    expect(paymentStatusSummary([payment], "me")[0]).toMatchObject({ sent: 45, paid: 0, received: 0 });
    expect(paymentStatusSummary([{ ...payment, status: "SETTLED" }], "me")[0]).toMatchObject({ sent: 0, paid: 45 });
    expect(paymentStatusSummary([{ ...payment, status: "CANCELLED" }], "me")).toEqual([]);
  });
  it("separates currencies, directions and ignores duplicate ledger records", () => {
    const result = paymentStatusSummary([payment, payment, { ...payment, id: "two", currency: "HKD", fromUserId: "other", toUserId: "me", amount: 10 }], "me");
    expect(result).toHaveLength(2);
    expect(result[0].sent).toBe(45);
    expect(result[1].awaitingReceipt).toBe(10);
    expect(paymentStatusSummary([payment], "unrelated")).toEqual([]);
  });
});
