import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/bill-history.css", "utf8");
const home = readFileSync("src/components/HomePaymentPanel.tsx", "utf8");
const expenses = readFileSync("src/components/LiveExpensesWorkspace.tsx", "utf8");
const bill = readFileSync("src/app/(app)/expenses/[id]/page.tsx", "utf8");
const statement = readFileSync("src/app/(app)/settlements/statement/page.tsx", "utf8");

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
});
