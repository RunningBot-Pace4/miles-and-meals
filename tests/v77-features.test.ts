import { describe, expect, it } from "vitest";
import { extractPdfTextBestEffort, parseBookingText } from "@/lib/booking-parser";
import { safeInternalPath } from "@/lib/navigation-safety";
import { buildReceiptItemization } from "@/lib/receipt-itemization";

describe("v77 navigation safety", () => {
  it("keeps normal same-origin app paths", () => {
    expect(safeInternalPath("/invite/abc?from=qr")).toBe("/invite/abc?from=qr");
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
  });

  it("rejects protocol-relative, backslash and encoded redirect tricks", () => {
    for (const value of [
      "//evil.example/path",
      "/\\\\evil.example/path",
      "/%2F%2Fevil.example/path",
      "/%5C%5Cevil.example/path",
      "/%252F%252Fevil.example/path",
      "/%255C%255Cevil.example/path",
      "https://evil.example/path",
    ]) {
      expect(safeInternalPath(value)).toBe("/dashboard");
    }
  });
});

describe("v77 Trip Inbox parsing", () => {
  it("extracts readable text from a simple uncompressed PDF text object", () => {
    const source = `%PDF-1.4\n1 0 obj\n<<>>\nstream\nBT\n(AirAsia Flight AK123) Tj\n(Booking Ref ABC123) Tj\n(2026-12-13 07:30) Tj\nET\nendstream\nendobj\n%%EOF`;
    const text = extractPdfTextBestEffort(new TextEncoder().encode(source));
    expect(text).toContain("AirAsia Flight AK123");
    expect(text).toContain("Booking Ref ABC123");
  });

  it("returns empty text for non-PDF or unreadable PDF data", () => {
    expect(extractPdfTextBestEffort(new TextEncoder().encode("not a pdf"))).toBe("");
    expect(
      extractPdfTextBestEffort(
        new TextEncoder().encode("%PDF-1.7\nstream\nx\\x9c binary compressed data\nendstream"),
      ),
    ).toBe("");
  });

  it("extracts common booking fields without exposing more than the parser input", () => {
    const parsed = parseBookingText(`AirAsia Flight\nBooking Ref: ABC123\n2026-12-13\n07:30`);
    expect(parsed.kind).toBe("FLIGHT");
    expect(parsed.confirmationNo).toBe("ABC123");
    expect(parsed.bookingDate).toBe("2026-12-13");
    expect(parsed.bookingTime).toBe("07:30");
  });
});

describe("v77 receipt itemization reconciliation", () => {
  it("reconciles item assignments, overhead and final splits exactly", () => {
    const result = buildReceiptItemization(110, 51.37, [
      { title: "Meal A", transactionAmount: 40, assigneeUserIds: ["jy"] },
      { title: "Meal B", transactionAmount: 30, assigneeUserIds: ["jh"] },
      { title: "Shared", transactionAmount: 20, assigneeUserIds: ["jy", "jh"] },
    ]);

    const splitTotal = result.splits.reduce(
      (sum, split) => sum + Number(split.shareAmountBase),
      0,
    );
    const itemTotal = result.items.reduce((sum, item) => sum + item.baseAmount, 0);

    expect(splitTotal).toBeCloseTo(51.37, 2);
    expect(itemTotal).toBeCloseTo(51.37, 2);
    expect(result.items.at(-1)).toEqual(
      expect.objectContaining({
        title: "Tax / service / remaining",
        synthetic: true,
      }),
    );
  });

  it("stays exact with awkward FX rounding", () => {
    const result = buildReceiptItemization(123456, 78.91, [
      { title: "A", transactionAmount: 33333, assigneeUserIds: ["a"] },
      { title: "B", transactionAmount: 44444, assigneeUserIds: ["b"] },
      { title: "C", transactionAmount: 22222, assigneeUserIds: ["a", "b"] },
    ]);

    expect(
      result.splits.reduce((sum, split) => sum + Math.round(Number(split.shareAmountBase) * 100), 0),
    ).toBe(7891);
    expect(
      result.items.reduce((sum, item) => sum + Math.round(item.baseAmount * 100), 0),
    ).toBe(7891);
  });

  it("rejects receipt lines that exceed the final receipt total", () => {
    expect(() =>
      buildReceiptItemization(50, 50, [
        { title: "Too much", transactionAmount: 60, assigneeUserIds: ["jy"] },
      ]),
    ).toThrow(/greater than the expense total/i);
  });
});
