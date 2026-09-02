import type { ParsedReceipt } from "@/lib/receipt-parser";
import { parseReceiptText } from "@/lib/receipt-parser";
import {
  findReceiptBounds,
  type ReceiptBounds,
} from "@/lib/receipt-crop";

export type OcrProgress = {
  status: string;
  progress: number;
};

type PreparedReceipt = {
  fullEnhanced: Blob;
  fullBinary: Blob;
  headerEnhanced: Blob;
  bottomEnhanced: Blob;
  bottomBinary: Blob;
};

type DecodedReceiptImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

async function decodeReceiptImage(
  file: File,
): Promise<DecodedReceiptImage> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Some iOS PWA builds can preview a camera image but cannot decode it
      // through createImageBitmap. The normal image decoder below is a safe
      // fallback for those devices.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error(
            "This receipt photo could not be decoded. Retake it using the camera button.",
          ),
        );
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new Error(
              "Unable to prepare the receipt image.",
            ),
          );
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

function createCanvas(
  width: number,
  height: number,
): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error(
      "Your browser could not prepare this receipt image.",
    );
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  return { canvas, context };
}

function grayscaleAndContrast(
  image: ImageData,
): ImageData {
  const data = image.data;

  for (
    let index = 0;
    index < data.length;
    index += 4
  ) {
    const gray =
      data[index] * 0.299 +
      data[index + 1] * 0.587 +
      data[index + 2] * 0.114;

    const contrasted = Math.max(
      0,
      Math.min(
        255,
        (gray - 128) * 1.42 + 128,
      ),
    );

    data[index] = contrasted;
    data[index + 1] = contrasted;
    data[index + 2] = contrasted;
    data[index + 3] = 255;
  }

  return image;
}

function otsuThreshold(
  image: ImageData,
): number {
  const histogram = new Array<number>(256).fill(0);
  const data = image.data;
  let pixelCount = 0;

  for (
    let index = 0;
    index < data.length;
    index += 4
  ) {
    histogram[data[index]] += 1;
    pixelCount += 1;
  }

  let totalWeighted = 0;

  for (
    let value = 0;
    value < 256;
    value += 1
  ) {
    totalWeighted += value * histogram[value];
  }

  let backgroundWeight = 0;
  let backgroundWeighted = 0;
  let maximumVariance = -1;
  let threshold = 170;

  for (
    let value = 0;
    value < 256;
    value += 1
  ) {
    backgroundWeight += histogram[value];

    if (backgroundWeight === 0) {
      continue;
    }

    const foregroundWeight =
      pixelCount - backgroundWeight;

    if (foregroundWeight === 0) {
      break;
    }

    backgroundWeighted +=
      value * histogram[value];

    const backgroundMean =
      backgroundWeighted / backgroundWeight;
    const foregroundMean =
      (totalWeighted - backgroundWeighted) /
      foregroundWeight;

    const variance =
      backgroundWeight *
      foregroundWeight *
      Math.pow(
        backgroundMean - foregroundMean,
        2,
      );

    if (variance > maximumVariance) {
      maximumVariance = variance;
      threshold = value;
    }
  }

  return Math.max(
    105,
    Math.min(220, threshold + 8),
  );
}

function binaryImage(
  image: ImageData,
): ImageData {
  const threshold = otsuThreshold(image);
  const data = image.data;

  for (
    let index = 0;
    index < data.length;
    index += 4
  ) {
    const value =
      data[index] < threshold
        ? 0
        : 255;

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  return image;
}

function cropCanvas(
  source: HTMLCanvasElement,
  startRatio: number,
  heightRatio: number,
): HTMLCanvasElement {
  const sourceY = Math.max(
    0,
    Math.round(source.height * startRatio),
  );
  const cropHeight = Math.max(
    1,
    Math.min(
      source.height - sourceY,
      Math.round(source.height * heightRatio),
    ),
  );

  const { canvas, context } = createCanvas(
    source.width,
    cropHeight,
  );

  context.drawImage(
    source,
    0,
    sourceY,
    source.width,
    cropHeight,
    0,
    0,
    source.width,
    cropHeight,
  );

  return canvas;
}

function detectReceiptCrop(
  decoded: DecodedReceiptImage,
): ReceiptBounds | null {
  const analysisMaxSide = 720;
  const analysisScale = Math.min(
    1,
    analysisMaxSide /
      Math.max(
        decoded.width,
        decoded.height,
      ),
  );
  const analysisWidth = Math.max(
    1,
    Math.round(
      decoded.width * analysisScale,
    ),
  );
  const analysisHeight = Math.max(
    1,
    Math.round(
      decoded.height * analysisScale,
    ),
  );
  const { canvas, context } = createCanvas(
    analysisWidth,
    analysisHeight,
  );

  context.drawImage(
    decoded.source,
    0,
    0,
    analysisWidth,
    analysisHeight,
  );

  const image = context.getImageData(
    0,
    0,
    analysisWidth,
    analysisHeight,
  );
  const luminance = new Uint8Array(
    analysisWidth * analysisHeight,
  );

  for (
    let sourceIndex = 0,
      pixelIndex = 0;
    sourceIndex < image.data.length;
    sourceIndex += 4,
      pixelIndex += 1
  ) {
    luminance[pixelIndex] = Math.round(
      image.data[sourceIndex] * 0.299 +
        image.data[sourceIndex + 1] *
          0.587 +
        image.data[sourceIndex + 2] *
          0.114,
    );
  }

  const bounds = findReceiptBounds(
    luminance,
    analysisWidth,
    analysisHeight,
  );

  if (!bounds) {
    return null;
  }

  const scaleX =
    decoded.width / analysisWidth;
  const scaleY =
    decoded.height / analysisHeight;
  const x = Math.max(
    0,
    Math.floor(bounds.x * scaleX),
  );
  const y = Math.max(
    0,
    Math.floor(bounds.y * scaleY),
  );
  const right = Math.min(
    decoded.width,
    Math.ceil(
      (bounds.x + bounds.width) * scaleX,
    ),
  );
  const bottom = Math.min(
    decoded.height,
    Math.ceil(
      (bounds.y + bounds.height) *
        scaleY,
    ),
  );

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

async function preprocessReceiptImage(
  file: File,
): Promise<PreparedReceipt> {
  const decoded = await decodeReceiptImage(file);

  try {
    const crop = detectReceiptCrop(decoded);
    const sourceWidth =
      crop?.width ?? decoded.width;
    const sourceHeight =
      crop?.height ?? decoded.height;
    const maxSide = 3600;
    const scale = Math.min(
      2.6,
      maxSide /
        Math.max(
          sourceWidth,
          sourceHeight,
        ),
    );

    const width = Math.max(
      1,
      Math.round(sourceWidth * scale),
    );
    const height = Math.max(
      1,
      Math.round(sourceHeight * scale),
    );

    const { canvas, context } = createCanvas(
      width,
      height,
    );

    context.drawImage(
      decoded.source,
      crop?.x ?? 0,
      crop?.y ?? 0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );

    const enhancedImage =
      grayscaleAndContrast(
        context.getImageData(
          0,
          0,
          width,
          height,
        ),
      );

    context.putImageData(
      enhancedImage,
      0,
      0,
    );

    const enhancedCanvas = canvas;

    const {
      canvas: binaryCanvas,
      context: binaryContext,
    } = createCanvas(
      width,
      height,
    );

    binaryContext.drawImage(
      enhancedCanvas,
      0,
      0,
    );

    const binaryData = binaryImage(
      binaryContext.getImageData(
        0,
        0,
        width,
        height,
      ),
    );

    binaryContext.putImageData(
      binaryData,
      0,
      0,
    );

    const headerCanvas = cropCanvas(
      enhancedCanvas,
      0,
      0.34,
    );

    const bottomEnhancedCanvas = cropCanvas(
      enhancedCanvas,
      0.46,
      0.54,
    );

    const bottomBinaryCanvas = cropCanvas(
      binaryCanvas,
      0.46,
      0.54,
    );

    const [
      fullEnhanced,
      fullBinary,
      headerEnhanced,
      bottomEnhanced,
      bottomBinary,
    ] = await Promise.all([
      canvasToBlob(enhancedCanvas, 0.97),
      canvasToBlob(binaryCanvas, 0.98),
      canvasToBlob(headerCanvas, 0.98),
      canvasToBlob(bottomEnhancedCanvas, 0.98),
      canvasToBlob(bottomBinaryCanvas, 0.98),
    ]);

    return {
      fullEnhanced,
      fullBinary,
      headerEnhanced,
      bottomEnhanced,
      bottomBinary,
    };
  } finally {
    decoded.close();
  }
}

function readableStatus(
  value: string,
): string {
  switch (value) {
    case "loading tesseract core":
      return "Loading OCR engine";
    case "initializing tesseract":
      return "Starting OCR engine";
    case "loading language traineddata":
      return "Loading receipt language";
    case "initializing api":
      return "Preparing text reader";
    case "recognizing text":
      return "Reading receipt text";
    default:
      return value.replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase(),
      );
  }
}

export async function recognizeReceiptLocally(
  file: File,
  fallbackCurrency: string | null,
  onProgress?: (
    progress: OcrProgress,
  ) => void,
): Promise<ParsedReceipt> {
  onProgress?.({
    status: "Finding receipt edges",
    progress: 0,
  });

  const prepared =
    await preprocessReceiptImage(file);

  const {
    createWorker,
    OEM,
    PSM,
  } = await import("tesseract.js");

  type Phase =
    | "FULL"
    | "ALT_FULL"
    | "HEADER"
    | "BOTTOM_ENHANCED"
    | "BOTTOM_BINARY";

  let phase: Phase = "FULL";

  const phaseRanges: Record<
    Phase,
    { start: number; weight: number; label: string }
  > = {
    FULL: {
      start: 0,
      weight: 0.28,
      label: "Reading full receipt",
    },
    ALT_FULL: {
      start: 0.28,
      weight: 0.2,
      label: "Checking faint text",
    },
    HEADER: {
      start: 0.48,
      weight: 0.18,
      label: "Reading shop header",
    },
    BOTTOM_ENHANCED: {
      start: 0.66,
      weight: 0.18,
      label: "Reading total area",
    },
    BOTTOM_BINARY: {
      start: 0.84,
      weight: 0.16,
      label: "Verifying final total",
    },
  };

  const worker = await createWorker(
    "eng+vie",
    OEM.LSTM_ONLY,
    {
      workerPath:
        "/tesseract/worker.min.js",
      corePath: "/tesseract/core",
      langPath: "/tesseract/lang",
      gzip: true,
      logger(message) {
        const range = phaseRanges[phase];
        const localProgress =
          typeof message.progress === "number"
            ? Math.max(
                0,
                Math.min(
                  1,
                  message.progress,
                ),
              )
            : 0;

        onProgress?.({
          status:
            message.status ===
            "recognizing text"
              ? range.label
              : readableStatus(
                  message.status,
                ),
          progress:
            range.start +
            localProgress * range.weight,
        });
      },
    },
  );

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_pageseg_mode: PSM.AUTO,
    });

    const fullResult =
      await worker.recognize(
        prepared.fullEnhanced,
      );

    phase = "ALT_FULL";

    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_pageseg_mode:
        PSM.SINGLE_BLOCK,
    });

    const altFullResult =
      await worker.recognize(
        prepared.fullBinary,
      );

    phase = "HEADER";

    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_pageseg_mode:
        PSM.SPARSE_TEXT,
    });

    const headerResult =
      await worker.recognize(
        prepared.headerEnhanced,
      );

    phase = "BOTTOM_ENHANCED";

    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_pageseg_mode:
        PSM.SINGLE_BLOCK,
    });

    const bottomEnhancedResult =
      await worker.recognize(
        prepared.bottomEnhanced,
      );

    phase = "BOTTOM_BINARY";

    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_pageseg_mode:
        PSM.SPARSE_TEXT,
    });

    const bottomBinaryResult =
      await worker.recognize(
        prepared.bottomBinary,
      );

    const confidence =
      fullResult.data.confidence * 0.28 +
      altFullResult.data.confidence * 0.2 +
      headerResult.data.confidence * 0.18 +
      bottomEnhancedResult.data.confidence * 0.18 +
      bottomBinaryResult.data.confidence * 0.16;

    onProgress?.({
      status: "Comparing receipt results",
      progress: 1,
    });

    return parseReceiptText(
      fullResult.data.text,
      fallbackCurrency,
      confidence,
      headerResult.data.text,
      altFullResult.data.text,
      [
        bottomEnhancedResult.data.text,
        bottomBinaryResult.data.text,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  } finally {
    await worker.terminate();
  }
}
