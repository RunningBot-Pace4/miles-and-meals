import {
  describe,
  expect,
  it,
} from "vitest";
import {
  isAllowedNumericInsertion,
  sanitizePositiveDecimalInput,
} from "@/lib/numeric-input";

describe("project-wide numeric input guard", () => {
  it("removes alphabetic characters and symbols from decimal fields", () => {
    expect(
      sanitizePositiveDecimalInput(
        "RM abc12.50xyz",
      ),
    ).toBe("12.50");
  });

  it("allows digits and common decimal/group separators", () => {
    expect(
      sanitizePositiveDecimalInput(
        "1,234.56",
      ),
    ).toBe("1,234.56");

    expect(
      isAllowedNumericInsertion(
        "123.45",
      ),
    ).toBe(true);

    expect(
      isAllowedNumericInsertion(
        "12A",
      ),
    ).toBe(false);
  });

  it("blocks minus signs because current money/rate/quantity inputs are positive-only", () => {
    expect(
      sanitizePositiveDecimalInput(
        "-25.50",
      ),
    ).toBe("25.50");
  });
});
