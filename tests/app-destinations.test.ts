import { describe, expect, it } from "vitest";
import { appDestination } from "@/lib/app-destinations";

describe("canonical app destinations", () => {
  it.each([
    ["/expenses", "/spend"],
    ["/receipts", "/spend?tab=review"],
    ["/notifications", "/updates"],
    ["/activity", "/updates?tab=activity"],
    ["/memories", "/trip-story"],
    ["/wrapped", "/trip-story?tab=highlights"],
    ["/companion", "/dashboard#attention"],
  ])("uses one destination for %s", (legacy, canonical) => {
    expect(appDestination(legacy)).toBe(canonical);
    expect(appDestination(canonical)).toBe(canonical);
  });
  it("keeps the selected trip and anchor when opening the payment hub", () => {
    expect(appDestination("/settlements?tripId=trip-a#history")).toBe("/spend?tripId=trip-a&tab=settlements#history");
  });
  it("preserves an explicit trip instead of replacing it with another tab context", () => {
    expect(appDestination("/spend?tab=budgets&tripId=trip-b", "trip-a")).toBe("/spend?tab=budgets&tripId=trip-b");
  });
  it("does not change bill details, edit actions or external destinations", () => {
    for (const href of ["/expenses/bill-1", "/expenses/bill-1/edit", "/expenses/new", "https://example.org/expenses", "//example.org/expenses", "#details"]) expect(appDestination(href)).toBe(href);
  });
  it("retains context across hub tabs", () => {
    expect(appDestination("/trip-story?tab=highlights", "trip a")).toBe("/trip-story?tab=highlights&tripId=trip+a");
  });
});
