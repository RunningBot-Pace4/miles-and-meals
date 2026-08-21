import { describe, expect, it } from "vitest";
import { parseReceiptText } from "@/lib/receipt-parser";

describe("receipt parser", () => {
  it("combines a split receipt header into the merchant name", () => {
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
      `
TAX INVOICE
HIGHLANDS COFFEE
TOTAL 120.000 VND
`,
      `
SUBTOTAL 120.000
TOTAL 120.000 VND
`,
    );

    expect(parsed.merchantName).toBe("HIGHLANDS COFFEE");
    expect(parsed.merchantCandidates).toContain(
      "HIGHLANDS COFFEE",
    );
    expect(parsed.totalAmount).toBe(120000);
    expect(parsed.totalCandidates).toContain(120000);
    expect(parsed.currencyCode).toBe("VND");
    expect(
      ["HIGH", "MEDIUM", "LOW"],
    ).toContain(
      parsed.merchantConfidence,
    );
    expect(
      ["HIGH", "MEDIUM", "LOW"],
    ).toContain(
      parsed.totalConfidence,
    );
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
    expect(parsed.merchantCandidates[0]).not.toMatch(
      /JALAN|KUALA LUMPUR/i,
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
      "EGG COFFEE",
      `
EGG COFFEE
SUBTOTAL 42.00
GRAND TOTAL RM 46.20
`,
      `
SUBTOTAL 42.00
SERVICE CHARGE 4.20
GRAND TOTAL RM 46.20
`,
    );

    expect(parsed.totalAmount).toBe(46.2);
    expect(parsed.currencyCode).toBe("MYR");
  });

  it("recognizes a common OCR mistake in TOTAL", () => {
    const parsed = parseReceiptText(
      `
CAFE TEST
SUBTOTAL 100,000
T0TAL 120,000 VND
`,
      "VND",
      76,
      "CAFE TEST",
      "",
      `
SUBTOTAL 100,000
T0TAL 120,000 VND
`,
    );

    expect(parsed.totalAmount).toBe(120000);
  });

  it("uses repeated OCR passes as stronger total evidence", () => {
    const parsed = parseReceiptText(
      `
LOCAL CAFE
TOTAL 18.50
`,
      "SGD",
      82,
      "LOCAL CAFE",
      `
LOCAL CAFE
TOTAL 18.50
`,
      `
SUBTOTAL 16.00
TOTAL 18.50
`,
    );

    expect(parsed.totalAmount).toBe(18.5);
    expect(parsed.totalCandidates[0]).toBe(18.5);
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

  it("flags missing receipt fields with low confidence", () => {
    const parsed = parseReceiptText(
      "THANK YOU",
      "MYR",
      22,
    );

    expect(
      parsed.merchantConfidence,
    ).toBe("LOW");
    expect(
      parsed.totalConfidence,
    ).toBe("LOW");
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
  it("reads a total amount printed on the line below TOTAL", () => {
    const parsed = parseReceiptText(
      `
MORNING CAFE
SUBTOTAL RM 27.50
TOTAL
RM 30.25
CASH RM 50.00
CHANGE RM 19.75
`,
      "MYR",
      80,
      "MORNING CAFE",
      `
MORNING CAFE
TOTAL
30.25
`,
      `
SUBTOTAL 27.50
TOTAL
RM 30.25
CASH 50.00
CHANGE 19.75
`,
    );

    expect(parsed.totalAmount).toBe(30.25);
    expect(parsed.totalCandidates[0]).toBe(30.25);
  });

  it("does not use receipt numbers as an unlabeled bottom fallback", () => {
    const parsed = parseReceiptText(
      `
SMALL SHOP
RECEIPT 20260821
THANK YOU
`,
      "MYR",
      70,
      "SMALL SHOP",
      "",
      `
RECEIPT 20260821
THANK YOU
`,
    );

    expect(parsed.totalAmount).toBeNull();
  });

});
