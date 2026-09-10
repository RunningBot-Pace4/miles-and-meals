import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/bill-history.css", "utf8");
const home = readFileSync("src/components/HomePaymentPanel.tsx", "utf8");
const expenses = readFileSync("src/components/LiveExpensesWorkspace.tsx", "utf8");
const bill = readFileSync("src/app/(app)/expenses/[id]/page.tsx", "utf8");
const statement = readFileSync("src/app/(app)/settlements/statement/page.tsx", "utf8");
const allocator = readFileSync("src/components/BillSettlementAllocator.tsx", "utf8");
const expenseForm = readFileSync("src/components/ExpenseForm.tsx", "utf8");
const settlement = readFileSync("src/components/LiveSettlementWorkspace.tsx", "utf8");

describe("modern payment PWA layout", () => {
  it("stacks payment cards before their text or controls can be squeezed", () => {
    const guard = css.slice(css.indexOf("/* PWA alignment guard"));
    expect(guard).toContain("@media(max-width:900px)");
    expect(guard).toContain("grid-template-columns:44px minmax(0,1fr)!important");
    expect(guard).toContain("grid-column:1/-1!important");
    expect(guard).toContain("overflow-x:clip");
    expect(guard).toContain("overflow-wrap:break-word");
  });

  it("keeps the Home request controls full width and grouped by person", () => {
    expect(home).toContain("home-payment-request-action");
    expect(home).toContain("Trip · required");
    expect(home).toContain("Bill / receipt · optional");
    expect(home).toContain("new Map<string, PaymentChoice[]>()");
  });

  it("turns expense actions into visible tap targets", () => {
    expect(expenses).toContain('className="button primary expense-card-action"');
    expect(expenses).toContain("View bill &amp; payments");
    expect(css).toContain(".expense-card .card-actions .text-danger");
  });

  it("uses collapsed payment actions on both detail views", () => {
    expect(bill).toContain('className="bill-payment-disclosure"');
    expect(bill).toContain("Payments for this bill");
    expect(statement).toContain('className="bill-payment-disclosure person-statement-payment-action"');
    expect(statement).toContain("Outstanding now");
  });

  it("uses one clear, responsive bill-payment card", () => {
    expect(allocator).toContain("Confirm money received");
    expect(allocator).toContain("Payment total");
    expect(allocator).toContain("Select a bill above to continue.");
    expect(allocator).toContain("Confirm ${formatMoney(selectedTotal, currency)} received");
    expect(allocator).not.toContain("Mark selected bills received");
    expect(css).toContain("/* Focused bill-payment card");
    expect(css).toContain("background:linear-gradient(135deg,#16877c,#0f6f67)");
    expect(css).toContain("@media(max-width:720px)");
  });

  it("fixes the expanded payment form width on desktop and mobile", () => {
    expect(css).toContain("grid-column:2!important");
    expect(css).toContain("grid-area:auto!important");
    expect(css).toContain(".bill-payment-allocator .settlement-payment-details-grid");
    expect(css).toContain(".bill-payment-allocator-footer>.settlement-action-wrap { grid-column:1!important; }");
  });

  it("removes receipt-item splitting while keeping ordinary expense sharing", () => {
    expect(expenseForm).not.toContain("Split by receipt items");
    expect(expenseForm).not.toContain("Apply itemized split");
    expect(expenseForm).toContain("itemization: []");
  });

  it("presents bill sharing, receipt availability and settlement calculations as cards", () => {
    expect(bill).toContain("Who shares this bill");
    expect(bill).toContain("No receipt added");
    expect(bill).toContain("bill-receipt-status");
    expect(settlement).toContain("We offset what each person paid and owed");
    expect(settlement).toContain("payer-position");
    expect(settlement).toContain("receiver-position");
    expect(css).toContain("/* Colourful money screens and screenshot follow-up");
  });
});
