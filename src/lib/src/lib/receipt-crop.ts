export type ReceiptBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function quantile(
  histogram: Uint32Array,
  pixelCount: number,
  ratio: number,
): number {
  const target = Math.max(
    1,
    Math.round(pixelCount * ratio),
  );
  let seen = 0;

  for (
    let value = 0;
    value < histogram.length;
    value += 1
  ) {
    seen += histogram[value];

    if (seen >= target) {
      return value;
    }
  }

  return 255;
}

/**
 * Finds a bright, paper-like connected area in a down-scaled luminance image.
 * It intentionally returns null on light or ambiguous backgrounds so OCR can
 * safely fall back to the complete image instead of cutting away receipt text.
 */
export function findReceiptBounds(
  luminance: Uint8Array,
  width: number,
  height: number,
): ReceiptBounds | null {
  const pixelCount = width * height;

  if (
    width < 24 ||
    height < 24 ||
    luminance.length !== pixelCount
  ) {
    return null;
  }

  const histogram = new Uint32Array(256);

  for (const value of luminance) {
    histogram[value] += 1;
  }

  const middle = quantile(
    histogram,
    pixelCount,
    0.5,
  );
  const bright = quantile(
    histogram,
    pixelCount,
    0.94,
  );

  // A mostly bright image has no dependable paper/background separation.
  if (middle > 205 || bright - middle < 24) {
    return null;
  }

  const threshold = Math.max(
    138,
    Math.min(
      238,
      Math.round(
        middle +
          (bright - middle) * 0.46,
      ),
    ),
  );
  const mask = new Uint8Array(pixelCount);

  for (
    let index = 0;
    index < pixelCount;
    index += 1
  ) {
    mask[index] =
      luminance[index] >= threshold ? 1 : 0;
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const minimumPixels = Math.round(
    pixelCount * 0.035,
  );
  const minimumWidth = width * 0.15;
  const minimumHeight = height * 0.22;
  let best:
    | (ReceiptBounds & {
        score: number;
        count: number;
      })
    | null = null;

  for (
    let start = 0;
    start < pixelCount;
    start += 1
  ) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    let head = 0;
    let tail = 0;
    let count = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    queue[tail] = start;
    tail += 1;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      count += 1;

      const y = Math.floor(index / width);
      const x = index - y * width;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const left = index - 1;
      const right = index + 1;
      const up = index - width;
      const down = index + width;

      if (
        x > 0 &&
        mask[left] &&
        !visited[left]
      ) {
        visited[left] = 1;
        queue[tail] = left;
        tail += 1;
      }

      if (
        x + 1 < width &&
        mask[right] &&
        !visited[right]
      ) {
        visited[right] = 1;
        queue[tail] = right;
        tail += 1;
      }

      if (
        y > 0 &&
        mask[up] &&
        !visited[up]
      ) {
        visited[up] = 1;
        queue[tail] = up;
        tail += 1;
      }

      if (
        y + 1 < height &&
        mask[down] &&
        !visited[down]
      ) {
        visited[down] = 1;
        queue[tail] = down;
        tail += 1;
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const boxArea = boxWidth * boxHeight;
    const areaRatio = boxArea / pixelCount;
    const density = count / boxArea;

    if (
      count < minimumPixels ||
      boxWidth < minimumWidth ||
      boxHeight < minimumHeight ||
      areaRatio < 0.055 ||
      areaRatio > 0.94 ||
      density < 0.24
    ) {
      continue;
    }

    const centreX =
      (minX + maxX) / 2 / width;
    const centreY =
      (minY + maxY) / 2 / height;
    const centreDistance = Math.min(
      1,
      Math.hypot(
        centreX - 0.5,
        centreY - 0.5,
      ) / 0.71,
    );
    const touchesEdges =
      Number(minX === 0) +
      Number(maxX === width - 1) +
      Number(minY === 0) +
      Number(maxY === height - 1);
    const score =
      count *
      (1.18 - centreDistance * 0.28) *
      Math.max(0.55, 1 - touchesEdges * 0.12);

    if (!best || score > best.score) {
      best = {
        x: minX,
        y: minY,
        width: boxWidth,
        height: boxHeight,
        score,
        count,
      };
    }
  }

  if (!best) {
    return null;
  }

  const horizontalPadding = Math.max(
    2,
    Math.round(best.width * 0.035),
  );
  const verticalPadding = Math.max(
    2,
    Math.round(best.height * 0.025),
  );
  const x = Math.max(
    0,
    best.x - horizontalPadding,
  );
  const y = Math.max(
    0,
    best.y - verticalPadding,
  );
  const right = Math.min(
    width,
    best.x +
      best.width +
      horizontalPadding,
  );
  const bottom = Math.min(
    height,
    best.y +
      best.height +
      verticalPadding,
  );
  const croppedArea =
    (right - x) * (bottom - y);

  if (croppedArea / pixelCount > 0.93) {
    return null;
  }

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}
