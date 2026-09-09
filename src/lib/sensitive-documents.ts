export const SENSITIVE_DOCUMENT_TYPES = new Set([
  "PASSPORT",
  "VISA",
  "MEDICAL",
] as const);

export function isSensitiveDocumentType(value: string): boolean {
  return SENSITIVE_DOCUMENT_TYPES.has(
    value as "PASSPORT" | "VISA" | "MEDICAL",
  );
}
