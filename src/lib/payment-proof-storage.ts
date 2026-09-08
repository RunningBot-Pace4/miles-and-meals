const MAX_PAYMENT_PROOF_BYTES = 420 * 1024;
const MAX_PAYMENT_PROOF_SIDE = 1280;
const MIN_PAYMENT_PROOF_SIDE = 640;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to prepare the payment proof."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Unable to read the payment proof."));
    };

    reader.readAsDataURL(blob);
  });
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to compress the payment proof."));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function compressPaymentProofForDatabase(
  file: File,
): Promise<string> {
  const supportedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

  if (!supportedTypes.has(file.type)) {
    throw new Error("Use a JPEG, PNG or WebP payment screenshot.");
  }

  if (file.size <= 0) {
    throw new Error("The selected payment screenshot is empty.");
  }

  const bitmap = await createImageBitmap(file);

  try {
    const initialScale = Math.min(
      1,
      MAX_PAYMENT_PROOF_SIDE / Math.max(bitmap.width, bitmap.height),
    );

    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    let quality = 0.78;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        throw new Error(
          "Your browser could not compress the payment screenshot.",
        );
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await canvasToJpeg(canvas, quality);

      if (blob.size <= MAX_PAYMENT_PROOF_BYTES) {
        return blobToDataUrl(blob);
      }

      if (quality > 0.5) {
        quality -= 0.08;
        continue;
      }

      const nextWidth = Math.round(width * 0.82);
      const nextHeight = Math.round(height * 0.82);

      if (Math.max(nextWidth, nextHeight) < MIN_PAYMENT_PROOF_SIDE) {
        break;
      }

      width = nextWidth;
      height = nextHeight;
      quality = 0.66;
    }

    throw new Error(
      "This payment screenshot is still too large after compression.",
    );
  } finally {
    bitmap.close();
  }
}
