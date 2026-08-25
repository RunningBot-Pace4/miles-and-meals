import { describe, expect, it } from "vitest";
import { compactOptionText } from "@/lib/display-text";

describe("compactOptionText", () => {
  it("keeps short native-select labels unchanged", () => {
    expect(compactOptionText("Japan 2027")).toBe("Japan 2027");
  });

  it("normalizes whitespace and caps long mobile dropdown labels", () => {
    const label = compactOptionText(
      "  A very long trip name that would otherwise stretch a mobile dropdown  ",
      30,
    );

    expect(label).toHaveLength(30);
    expect(label).toBe("A very long trip name that wo…");
  });
});
