const SUPPORTED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_RECEIPT_BYTES = 12 * 1024 * 1024;

export function validateReceiptFile(file: File): void {
  if (!SUPPORTED_RECEIPT_TYPES.has(file.type)) {
    throw new Error(
      "Use a JPEG, PNG or WebP receipt photo. If your iPhone photo is HEIC, take a new photo from the camera button.",
    );
  }

  if (file.size <= 0) {
    throw new Error("The selected receipt photo is empty.");
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt photos must be 12 MB or smaller.");
  }
}

export function safeReceiptFilename(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() || "jpg";
  const stem = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${stem || "receipt"}.${extension}`;
}
