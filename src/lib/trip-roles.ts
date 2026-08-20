export function isTripOwnerRole(
  role: string,
): boolean {
  const normalized =
    role
      .trim()
      .toUpperCase();

  return (
    normalized === "OWNER" ||
    normalized === "ADMIN"
  );
}
