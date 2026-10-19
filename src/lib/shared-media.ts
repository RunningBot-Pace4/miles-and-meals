// This is the complete sharing notice stored with each explicit upload consent.
export const MEDIA_CONSENT_VERSION = "admin-sharing-v1";
export const MEDIA_CONSENT_TEXT = "I choose to upload these files and share their originals with this app's system admins, including future admins. Originals may include location metadata. I can remove my shared files later. Removal stops future access in this app but cannot recall copies already saved by an admin.";
export const MEDIA_TYPES = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
} as const;
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
export const MAX_SHARED_BYTES = 400 * 1024 * 1024;
export const MAX_OWNER_FILES = 100;
export type MediaType = keyof typeof MEDIA_TYPES;
export function isMediaType(type: string): type is MediaType { return Object.hasOwn(MEDIA_TYPES, type); }
export function mediaPath(id: string, type: MediaType) { return `shared-media/${id}.${MEDIA_TYPES[type]}`; }
export function safeMediaName(value: string) { return value.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 160); }
export function mediaSignatureMatches(type: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png") return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (type === "image/webp") return ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP";
  if (type === "video/webm") return [26,69,223,163].every((v,i) => bytes[i] === v);
  if (type === "video/mp4" || type === "video/quicktime") return bytes.length >= 12 && ["ftyp", "moov", "mdat", "wide"].includes(ascii(4,8));
  return false;
}
export function parseMediaRange(header: string | null, size: number): { start: number; end: number } | null | false {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? { start, end } : false;
}
