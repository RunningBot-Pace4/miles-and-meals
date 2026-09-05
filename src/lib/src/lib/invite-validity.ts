export const TRIP_INVITE_VALIDITY_HOURS = 12;
export const TRIP_INVITE_VALIDITY_MS = 43_200_000;

export function tripInviteExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + TRIP_INVITE_VALIDITY_MS);
}

export function earliestValidTripInviteCreatedAt(now = new Date()): Date {
  return new Date(now.getTime() - TRIP_INVITE_VALIDITY_MS);
}
