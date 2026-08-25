/**
 * Keeps native select menus usable on narrow screens while preserving the
 * complete value in the underlying record and the option title.
 */
export function compactOptionText(value: string, maxLength = 42): string {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}
