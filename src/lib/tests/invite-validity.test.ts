import { describe, expect, it } from "vitest";
import {
  earliestValidTripInviteCreatedAt,
  TRIP_INVITE_VALIDITY_HOURS,
  TRIP_INVITE_VALIDITY_MS,
  tripInviteExpiresAt,
} from "@/lib/invite-validity";

describe("trip invite validity", () => {
  it("uses the same exact 12-hour window for links and QR codes", () => {
    const now = new Date("2026-08-25T04:00:00.000Z");

    expect(TRIP_INVITE_VALIDITY_HOURS).toBe(12);
    expect(TRIP_INVITE_VALIDITY_MS).toBe(43_200_000);
    expect(tripInviteExpiresAt(now).toISOString()).toBe("2026-08-25T16:00:00.000Z");
    expect(earliestValidTripInviteCreatedAt(now).toISOString()).toBe("2026-08-24T16:00:00.000Z");
  });
});
