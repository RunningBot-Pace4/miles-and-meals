import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveSettlementWorkspace } from "@/components/LiveSettlementWorkspace";
import type { SettlementLiveData } from "@/lib/settlement-live";

const initialData: SettlementLiveData = {
  baseCurrency: "MYR",
  people: [],
  waitingTransfers: [
    {
      countryId: "country-1",
      countryName: "Vietnam",
      tripId: "trip-1",
      tripName: "Vietnam - Working Trip",
      currency: "MYR",
      fromUserId: "me",
      fromName: "JY",
      toUserId: "friend",
      toName: "Juehua",
      amount: 10,
    },
  ],
  pendingSettlements: [
    {
      id: "payment-3",
      countryId: "country-1",
      countryName: "Vietnam",
      tripId: "trip-1",
      tripName: "Vietnam - Working Trip",
      currency: "MYR",
      fromUserId: "me",
      fromName: "JY",
      toUserId: "friend",
      toName: "Juehua",
      amount: 20,
      status: "SENT",
      sentAt: "2026-09-03T10:00:00.000Z",
      confirmedAt: null,
    },
  ],
  settledSettlements: [
    {
      id: "payment-1",
      countryId: "country-1",
      countryName: "Vietnam",
      tripId: "trip-1",
      tripName: "Vietnam - Working Trip",
      currency: "MYR",
      fromUserId: "me",
      fromName: "JY",
      toUserId: "friend",
      toName: "Juehua",
      amount: 40,
      status: "SETTLED",
      sentAt: "2026-09-01T10:00:00.000Z",
      confirmedAt: "2026-09-01T10:05:00.000Z",
    },
    {
      id: "payment-2",
      countryId: "country-1",
      countryName: "Vietnam",
      tripId: "trip-1",
      tripName: "Vietnam - Working Trip",
      currency: "MYR",
      fromUserId: "me",
      fromName: "JY",
      toUserId: "friend",
      toName: "Juehua",
      amount: 30,
      status: "SETTLED",
      sentAt: "2026-09-02T10:00:00.000Z",
      confirmedAt: "2026-09-02T10:05:00.000Z",
    },
  ],
  smartPlans: [],
};

describe("individual payment ledger UI", () => {
  const markup = renderToStaticMarkup(
    <LiveSettlementWorkspace
      initialData={initialData}
      currentUserId="me"
      countryId="country-1"
      variant="settlements"
    />,
  );

  it("renders the person, direction and all three transactions", () => {
    expect(markup).toContain("Payments by person");
    expect(markup).toContain("You → Juehua");
    expect(markup).toContain("3 payment transactions");
    expect(
      markup.match(/class="individual-payment-transaction"/g),
    ).toHaveLength(3);
  });

  it("renders confirmed, pending, unpaid and per-transaction balance states", () => {
    expect(markup).toContain("Confirmed paid");
    expect(markup).toContain("Awaiting confirmation");
    expect(markup).toContain("Still to pay");
    expect(markup).toContain("Partial payment confirmed");
    expect(markup).toContain("Partial payment · awaiting confirmation");
    expect(markup.match(/Remaining after/g)).toHaveLength(3);
  });
});
