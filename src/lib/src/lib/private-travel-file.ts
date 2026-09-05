const MAX_PRIVATE_FILE_BYTES = 850_000;
const supported = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function readPrivateTravelFile(file: File, imageOnly = false): Promise<string> {
  if (!supported.has(file.type) || (imageOnly && !file.type.startsWith("image/"))) {
    throw new Error(imageOnly ? "Use a JPEG, PNG or WebP image." : "Use a JPEG, PNG, WebP or PDF file.");
  }
  if (!file.size || file.size > MAX_PRIVATE_FILE_BYTES) {
    throw new Error("Choose a file smaller than 850 KB so it remains reliable on mobile and offline.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read this file."));
    reader.onerror = () => reject(new Error("Unable to read this file."));
    reader.readAsDataURL(file);
  });
}
