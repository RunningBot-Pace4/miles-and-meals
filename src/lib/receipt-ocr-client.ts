import type { ParsedReceipt } from "@/lib/receipt-parser";
import { parseReceiptText } from "@/lib/receipt-parser";

export type OcrProgress = {
  status: string;
  progress: number;
};

type PreparedReceipt = {
  full: Blob;
  header: Blob;
};

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

async function preprocessReceiptImage(
  file: File,
): Promise<PreparedReceipt> {
  const bitmap = await createImageBitmap(file);

  try {
    const maxSide = 2200;
    const scale = Math.min(
      2,
      maxSide /
        Math.max(bitmap.width, bitmap.height),
    );

    const width = Math.max(
      1,
      Math.round(bitmap.width * scale),
    );
    const height = Math.max(
      1,
      Math.round(bitmap.height * scale),
    );

    const canvas =
      document.createElement("canvas");
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
    context.drawImage(
      bitmap,
      0,
      0,
      width,
      height,
    );

    const image = context.getImageData(
      0,
      0,
      width,
      height,
    );
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
          (gray - 128) * 1.34 + 128,
        ),
      );

      data[index] = contrasted;
      data[index + 1] = contrasted;
      data[index + 2] = contrasted;
      data[index + 3] = 255;
    }

    context.putImageData(image, 0, 0);

    const headerHeight = Math.max(
      1,
      Math.round(height * 0.38),
    );
    const headerCanvas =
      document.createElement("canvas");
    headerCanvas.width = width;
    headerCanvas.height = headerHeight;

    const headerContext =
      headerCanvas.getContext("2d", {
        alpha: false,
      });

    if (!headerContext) {
      throw new Error(
        "Your browser could not prepare the receipt header.",
      );
    }

    headerContext.fillStyle = "#ffffff";
    headerContext.fillRect(
      0,
      0,
      width,
      headerHeight,
    );
    headerContext.drawImage(
      canvas,
      0,
      0,
      width,
      headerHeight,
      0,
      0,
      width,
      headerHeight,
    );

    const [full, header] = await Promise.all([
      canvasToBlob(canvas, 0.94),
      canvasToBlob(headerCanvas, 0.96),
    ]);

    return { full, header };
  } finally {
    bitmap.close();
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
  const prepared =
    await preprocessReceiptImage(file);
  const {
    createWorker,
    OEM,
    PSM,
  } = await import("tesseract.js");

  let phase:
    | "FULL"
    | "HEADER" = "FULL";

  const worker = await createWorker(
    "eng",
    OEM.LSTM_ONLY,
    {
      logger(message) {
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

        const progress =
          phase === "FULL"
            ? localProgress * 0.72
            : 0.72 +
              localProgress * 0.28;

        onProgress?.({
          status:
            phase === "HEADER" &&
            message.status ===
              "recognizing text"
              ? "Reading shop header"
              : readableStatus(
                  message.status,
                ),
          progress,
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
      await worker.recognize(prepared.full);

    phase = "HEADER";

    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_pageseg_mode:
        PSM.SPARSE_TEXT,
    });

    const headerResult =
      await worker.recognize(
        prepared.header,
      );

    const confidence =
      (fullResult.data.confidence +
        headerResult.data.confidence) /
      2;

    return parseReceiptText(
      fullResult.data.text,
      fallbackCurrency,
      confidence,
      headerResult.data.text,
    );
  } finally {
    await worker.terminate();
  }
}
