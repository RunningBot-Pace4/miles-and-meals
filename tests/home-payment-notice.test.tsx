import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HomePaymentPanel } from "../src/components/HomePaymentPanel";

it("shows current pending cards without the historical green acknowledgement", () => {
  const data: any = { smartPlans: [], pendingSettlements: [{ id: "payment", fromUserId: "me", toUserId: "jy", toName: "JY", tripName: "Vietnam Trip", amount: 8.90, currency: "MYR", allocations: [] }] };
  const before = renderToStaticMarkup(<HomePaymentPanel data={data} currentUserId="me" />);
  expect(before).toContain("Waiting for confirmation");
  expect(before).not.toContain("bill-payment-saved");
  data.pendingSettlements = [];
  const after = renderToStaticMarkup(<HomePaymentPanel data={data} currentUserId="me" />);
  expect(after).not.toContain("Waiting for confirmation");
  expect(after).not.toContain("awaiting confirmation");
  expect(after).toContain("Nothing outstanding");
});
