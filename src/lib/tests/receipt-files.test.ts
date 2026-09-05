import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_BYTES,
  safeReceiptFilename,
  validateReceiptFile,
} from "@/lib/receipt-files";

function fakeFile(
  type: string,
  size: number,
  name = "receipt.jpg",
): File {
  return {
    type,
    size,
    name,
  } as File;
}

describe("receipt file validation", () => {
  it("accepts jpeg receipt photos", () => {
    expect(() =>
      validateReceiptFile(fakeFile("image/jpeg", 1024)),
    ).not.toThrow();
  });

  it("rejects unsupported HEIC input", () => {
    expect(() =>
      validateReceiptFile(fakeFile("image/heic", 1024, "receipt.heic")),
    ).toThrow(/JPEG, PNG or WebP/);
  });

  it("rejects oversized files", () => {
    expect(() =>
      validateReceiptFile(
        fakeFile("image/jpeg", MAX_RECEIPT_BYTES + 1),
      ),
    ).toThrow(/12 MB/);
  });

  it("sanitizes uploaded receipt names", () => {
    expect(safeReceiptFilename("My Receipt #12.JPG")).toBe(
      "My-Receipt-12.jpg",
    );
  });
});
