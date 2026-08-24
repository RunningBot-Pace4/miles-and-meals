const CONTROL_OR_BACKSLASH = /[\\\u0000-\u001f\u007f]/;

/**
 * Accept only same-origin application paths for auth return navigation.
 * This deliberately rejects protocol-relative URLs, encoded protocol-relative
 * URLs and backslash variants that browsers may normalize into a new origin.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    CONTROL_OR_BACKSLASH.test(candidate)
  ) {
    return fallback;
  }

  let decoded = candidate;
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return fallback;
    }

    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      CONTROL_OR_BACKSLASH.test(decoded)
    ) {
      return fallback;
    }
  }

  return candidate;
}
