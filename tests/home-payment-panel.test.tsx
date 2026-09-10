import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePaymentPanel } from "@/components/HomePaymentPanel";
import type { SettlementLiveData } from "@/lib/settlement-live";

describe("simple Home payment requests", () => {
  it("uses the known person and trip and keeps receipt selection inside payment details", () => {
    const data = {
      baseCurrency: "MYR",
      people: [],
      waitingTransfers: [],
      pendingSettlements: [],
      settledSettlements: [],
      smartPlans: [{
        countryId: "country-1",
        countryName: "Malaysia",
        tripId: "trip-1",
        tripName: "Local Trip",
        currency: "MYR",
        originalExpenseBalances: [{
          fromUserId: "parent",
          fromName: "Parent",
          toUserId: "me",
          toName: "Me",
          directRemaining: 5,
          expenses: [{ expenseId: "receipt-1", expenseDate: "2026-09-10", description: "Breakfast", remainingAmount: 5 }],
        }],
      }],
    } as unknown as SettlementLiveData;

    const html = renderToStaticMarkup(<HomePaymentPanel data={data} currentUserId="me" />);
    expect(html).toContain("Parent → You");
    expect(html).toContain("Local Trip");
    expect(html).toContain("Trip · required");
    expect(html).toContain("Breakfast");
    expect(html).toContain("Payment details · optional");
    expect(html).toContain("Bill / receipt · optional");
    expect(html).not.toContain("Choose a trip");
    expect(html).not.toContain("Choose a person");
    expect(html).not.toContain("I want to");
  });
});
