import { describe, expect, it } from "vitest";
import { parseTravelNumber } from "@/lib/numbers";

describe("parseTravelNumber", () => {
  it("parses plain and grouped amounts", () => {
    expect(parseTravelNumber("150000")).toBe(150000);
    expect(parseTravelNumber("150,000")).toBe(150000);
    expect(parseTravelNumber("1,234.56")).toBe(1234.56);
  });

  it("parses decimal-comma formats", () => {
    expect(parseTravelNumber("1.234,56")).toBe(1234.56);
    expect(parseTravelNumber("0,0001579")).toBeCloseTo(0.0001579);
  });

  it("rejects invalid numbers", () => {
    expect(parseTravelNumber("")).toBeNull();
    expect(parseTravelNumber("abc")).toBeNull();
  });
});
