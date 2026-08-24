import { describe, expect, it } from "vitest";
import {
  isIsoCalendarDate,
  isValidDateRange,
  selectDateRange,
} from "@/lib/date-range";

describe("click-twice date ranges", () => {
  it("treats the first click as start and the second click as end", () => {
    const first = selectDateRange({ startDate: "", endDate: "" }, "2026-09-05");
    expect(first).toEqual({ startDate: "2026-09-05", endDate: "" });

    const second = selectDateRange(first, "2026-09-09");
    expect(second).toEqual({ startDate: "2026-09-05", endDate: "2026-09-09" });
  });

  it("starts over after a complete range or an earlier second click", () => {
    expect(
      selectDateRange(
        { startDate: "2026-09-05", endDate: "2026-09-09" },
        "2026-10-02",
      ),
    ).toEqual({ startDate: "2026-10-02", endDate: "" });

    expect(
      selectDateRange(
        { startDate: "2026-09-09", endDate: "" },
        "2026-09-05",
      ),
    ).toEqual({ startDate: "2026-09-05", endDate: "" });
  });

  it("rejects impossible and incomplete ranges", () => {
    expect(isIsoCalendarDate("2026-02-29")).toBe(false);
    expect(isValidDateRange("", "")).toBe(true);
    expect(isValidDateRange("2026-09-05", "")).toBe(false);
    expect(isValidDateRange("2026-09-09", "2026-09-05")).toBe(false);
    expect(isValidDateRange("2026-09-05", "2026-09-09")).toBe(true);
  });
});
