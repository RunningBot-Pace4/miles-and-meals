const MAX_STORED_RECEIPT_BYTES = 600 * 1024;
const MAX_STORED_SIDE = 1280;
const MIN_STORED_SIDE = 720;

function blobToDataUrl(
  blob: Blob,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result === "string"
        ) {
          resolve(reader.result);
        } else {
          reject(
            new Error(
              "Unable to prepare the receipt photo.",
            ),
          );
        }
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read the receipt photo.",
          ),
        );
      };

      reader.readAsDataURL(blob);
    },
  );
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "Unable to compress the receipt photo.",
              ),
            );
          }
        },
        "image/jpeg",
        quality,
      );
    },
  );
}

export async function compressReceiptForDatabase(
  file: File,
): Promise<string> {
  const supportedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

  if (!supportedTypes.has(file.type)) {
    throw new Error(
      "Use a JPEG, PNG or WebP receipt photo.",
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "The selected receipt photo is empty.",
    );
  }

  const bitmap =
    await createImageBitmap(file);

  try {
    let scale = Math.min(
      1,
      MAX_STORED_SIDE /
        Math.max(
          bitmap.width,
          bitmap.height,
        ),
    );

    let width = Math.max(
      1,
      Math.round(
        bitmap.width * scale,
      ),
    );
    let height = Math.max(
      1,
      Math.round(
        bitmap.height * scale,
      ),
    );
    let quality = 0.76;

    for (
      let attempt = 0;
      attempt < 8;
      attempt += 1
    ) {
      const canvas =
        document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context =
        canvas.getContext("2d", {
          alpha: false,
        });

      if (!context) {
        throw new Error(
          "Your browser could not compress the receipt photo.",
        );
      }

      context.fillStyle = "#ffffff";
      context.fillRect(
        0,
        0,
        width,
        height,
      );
      context.drawImage(
        bitmap,
        0,
        0,
        width,
        height,
      );

      const blob =
        await canvasToJpeg(
          canvas,
          quality,
        );

      if (
        blob.size <=
        MAX_STORED_RECEIPT_BYTES
      ) {
        return blobToDataUrl(blob);
      }

      if (quality > 0.5) {
        quality -= 0.08;
        continue;
      }

      const nextWidth =
        Math.round(width * 0.82);
      const nextHeight =
        Math.round(height * 0.82);

      if (
        Math.max(
          nextWidth,
          nextHeight,
        ) < MIN_STORED_SIDE
      ) {
        break;
      }

      width = nextWidth;
      height = nextHeight;
      quality = 0.66;
    }

    throw new Error(
      "This receipt photo is still too large after compression. Retake it closer to the receipt.",
    );
  } finally {
    bitmap.close();
  }
}

export function isEmbeddedReceipt(
  value: string | null | undefined,
): boolean {
  return Boolean(
    value?.startsWith(
      "data:image/jpeg;base64,",
    ),
  );
}
