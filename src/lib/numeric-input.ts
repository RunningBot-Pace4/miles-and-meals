export function sanitizePositiveDecimalInput(
  value: string,
): string {
  return value.replace(
    /[^0-9.,]/g,
    "",
  );
}

export function isAllowedNumericInsertion(
  value: string,
): boolean {
  return /^[0-9.,]*$/.test(
    value,
  );
}
