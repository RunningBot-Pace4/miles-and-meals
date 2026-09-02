import { describe, expect, it } from "vitest";
import { findReceiptBounds } from "@/lib/receipt-crop";

function image(
  width: number,
  height: number,
  background: number,
): Uint8Array {
  return new Uint8Array(
    width * height,
  ).fill(background);
}

function rectangle(
  pixels: Uint8Array,
  imageWidth: number,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number,
) {
  for (
    let row = y;
    row < y + height;
    row += 1
  ) {
    for (
      let column = x;
      column < x + width;
      column += 1
    ) {
      pixels[row * imageWidth + column] =
        value;
    }
  }
}

describe("receipt edge detection", () => {
  it("isolates a narrow bright receipt from a dark table", () => {
    const width = 200;
    const height = 300;
    const pixels = image(
      width,
      height,
      72,
    );

    rectangle(
      pixels,
      width,
      62,
      20,
      78,
      260,
      244,
    );

    // Text creates dark holes without breaking the surrounding paper.
    for (let row = 45; row < 250; row += 17) {
      rectangle(
        pixels,
        width,
        72,
        row,
        56,
        2,
        42,
      );
    }

    const bounds = findReceiptBounds(
      pixels,
      width,
      height,
    );

    expect(bounds).not.toBeNull();
    expect(bounds?.x).toBeLessThanOrEqual(62);
    expect(bounds?.x).toBeGreaterThan(50);
    expect(bounds?.width).toBeGreaterThanOrEqual(78);
    expect(bounds?.width).toBeLessThan(100);
    expect(bounds?.height).toBeGreaterThanOrEqual(260);
  });

  it("keeps a complete image when the background is already light", () => {
    const pixels = image(120, 180, 238);

    expect(
      findReceiptBounds(
        pixels,
        120,
        180,
      ),
    ).toBeNull();
  });

  it("ignores a small bright reflection", () => {
    const pixels = image(160, 220, 55);
    rectangle(
      pixels,
      160,
      10,
      10,
      22,
      22,
      255,
    );

    expect(
      findReceiptBounds(
        pixels,
        160,
        220,
      ),
    ).toBeNull();
  });
});
