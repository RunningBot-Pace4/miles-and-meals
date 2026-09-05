import { describe, expect, it } from "vitest";
import {
  countryCatalog,
  getCountryCatalogItem,
} from "@/lib/country-catalog";

describe("country catalog", () => {
  it("auto maps Vietnam to VN and VND", () => {
    expect(getCountryCatalogItem("VN")).toEqual({
      name: "Vietnam",
      code: "VN",
      currencyCode: "VND",
    });
  });

  it("auto maps Malaysia to MY and MYR", () => {
    expect(getCountryCatalogItem("MY")).toEqual({
      name: "Malaysia",
      code: "MY",
      currencyCode: "MYR",
    });
  });

  it("contains unique country codes", () => {
    const codes = countryCatalog.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
