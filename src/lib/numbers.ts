/**
 * Parses travel-money input while accepting common grouping formats.
 *
 * Examples:
 * - 100000       -> 100000
 * - 100,000      -> 100000
 * - 1,234.56     -> 1234.56
 * - 1.234,56     -> 1234.56
 * - 0,0001579    -> 0.0001579
 */
export function parseTravelNumber(
  value: string | number | null | undefined,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^0-9.,+\-]/g, "");

  if (!raw || raw === "+" || raw === "-") {
    return null;
  }

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastDot > lastComma) {
      normalized = raw.replace(/,/g, "");
    } else {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma >= 0) {
    const groupedThousands = /^[+-]?\d{1,3}(,\d{3})+$/.test(raw);
    normalized = groupedThousands
      ? raw.replace(/,/g, "")
      : raw.replace(",", ".");
  } else if (lastDot >= 0) {
    const groupedThousands = /^[+-]?\d{1,3}(\.\d{3})+$/.test(raw);
    if (groupedThousands) {
      normalized = raw.replace(/\./g, "");
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
