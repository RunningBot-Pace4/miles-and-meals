import { describe, expect, it } from "vitest";
import { parseReceiptText } from "@/lib/receipt-parser";

describe("receipt parser", () => {
  it("finds a merchant and VND total", () => {
    const parsed = parseReceiptText(
      `
HIGHLANDS COFFEE
123 LE LOI STREET
TAX INVOICE

Cappuccino       65,000
Cake             55,000

SUBTOTAL        120,000
TOTAL           120,000 VND
Thank you
`,
      "VND",
      88,
    );

    expect(parsed.merchantName).toBe("HIGHLANDS COFFEE");
    expect(parsed.totalAmount).toBe(120000);
    expect(parsed.currencyCode).toBe("VND");
    expect(parsed.confidence).toBe("HIGH");
  });

  it("does not choose subtotal over grand total", () => {
    const parsed = parseReceiptText(
      `
EGG COFFEE
SUBTOTAL 42.00
SERVICE CHARGE 4.20
GRAND TOTAL RM 46.20
`,
      "MYR",
      80,
    );

    expect(parsed.totalAmount).toBe(46.2);
    expect(parsed.currencyCode).toBe("MYR");
  });

  it("handles European-style decimals", () => {
    const parsed = parseReceiptText(
      `
SHOP TEST
TOTAL EUR 1.234,56
`,
      "EUR",
      82,
    );

    expect(parsed.totalAmount).toBe(1234.56);
  });

  it("handles dot thousands on VND receipts", () => {
    const parsed = parseReceiptText(
      `
CAFE TEST
TONG CONG 250.000 VND
`,
      "VND",
      78,
    );

    expect(parsed.totalAmount).toBe(250000);
  });

  it("falls back to the selected country currency", () => {
    const parsed = parseReceiptText(
      `
LOCAL CAFE
TOTAL 18.50
`,
      "SGD",
      82,
    );

    expect(parsed.currencyCode).toBe("SGD");
  });
});
