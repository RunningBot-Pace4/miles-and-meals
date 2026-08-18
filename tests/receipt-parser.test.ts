import { describe, expect, it } from "vitest";
import { parseReceiptText } from "@/lib/receipt-parser";

describe("receipt parser", () => {
  it("uses the receipt header to identify the merchant", () => {
    const parsed = parseReceiptText(
      `
TAX INVOICE
ORDER 88172
Cappuccino       65,000
Cake             55,000
SUBTOTAL        120,000
TOTAL           120,000 VND
Thank you
`,
      "VND",
      88,
      `
HIGHLANDS
COFFEE
123 LE LOI STREET
`,
    );

    expect(parsed.merchantName).toBe("HIGHLANDS COFFEE");
    expect(parsed.merchantCandidates).toContain(
      "HIGHLANDS COFFEE",
    );
    expect(parsed.totalAmount).toBe(120000);
    expect(parsed.currencyCode).toBe("VND");
  });

  it("prefers a merchant-like header over an address", () => {
    const parsed = parseReceiptText(
      `
VAT RECEIPT
TOTAL RM 46.20
`,
      "MYR",
      84,
      `
LITTLE HANOI EGG COFFEE
12 JALAN SULTAN
KUALA LUMPUR
`,
    );

    expect(parsed.merchantName).toBe(
      "LITTLE HANOI EGG COFFEE",
    );
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
});
