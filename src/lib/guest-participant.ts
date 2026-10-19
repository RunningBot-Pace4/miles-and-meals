/** Non-login participant identities share the financial ledger's person keys. */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const GUEST_ID = new RegExp(`^guest:(${UUID}):(${UUID})$`);
export function isGuestParticipantId(id: string): boolean { return GUEST_ID.test(id); }
export function guestCountryId(id: string): string | null { return id.match(GUEST_ID)?.[1] ?? null; }
export function participantDisplayName(id: string, name: string): string {
  return isGuestParticipantId(id) ? `${name} · Guest` : name;
}
export function guestParticipantProfile(countryId: string, requestId: string, name: string) {
  const id = `guest:${countryId.toLowerCase()}:${requestId.toLowerCase()}`;
  if (!isGuestParticipantId(id)) throw new Error("Invalid guest identity.");
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 80) throw new Error("Guest name must be 1–80 characters.");
  return {
    id, name: normalized, email: `${countryId.replaceAll("-", "").toLowerCase()}${requestId.replaceAll("-", "").toLowerCase()}@guests.invalid`,
    role: "guest", banned: true, emailVerified: false,
    banReason: "Guest traveler profile. Login is disabled.",
  };
}
