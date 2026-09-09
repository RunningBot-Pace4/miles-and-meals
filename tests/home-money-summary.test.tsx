import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeMoneySummary } from "@/components/HomeMoneySummary";
import type { SettlementLiveData } from "@/lib/settlement-live";

describe("personal Home money summary", () => {
  it("keeps incoming pending transfers separate from unpaid amounts and shows only my totals", () => {
    const data = { baseCurrency: "MYR", people: [
      { userId: "me", toPay: 30, toReceive: 120, paymentSent: 20, awaitingConfirmation: 50 },
      { userId: "other", toPay: 9999, toReceive: 0, paymentSent: 0, awaitingConfirmation: 0 },
    ] } as SettlementLiveData;
    const html = renderToStaticMarkup(<HomeMoneySummary data={data} currentUserId="me" />);
    expect(html).toContain("70.00");
    expect(html).toContain("50.00");
    expect(html).not.toContain("120.00");
    expect(html).not.toContain("9,999");
    expect(html).toContain('href="/spend"');
    expect(html).not.toContain("Mark paid");
  });
});
