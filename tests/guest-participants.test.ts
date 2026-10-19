import { describe, expect, it } from "vitest";
import { guestCountryId, guestParticipantProfile, isGuestParticipantId, participantDisplayName } from "@/lib/guest-participant";
import { splitEqually } from "@/lib/money";
import { calculateOutstandingSettlements } from "@/lib/settlement";
import { canReverseSettlement } from "@/lib/settlement-status";
const country = "10000000-0000-4000-8000-000000000001";
const alex = guestParticipantProfile(country, "10000000-0000-4000-8000-000000000002", " Alex ");
const sam = guestParticipantProfile(country, "10000000-0000-4000-8000-000000000003", "Sam");
describe("mixed app users and named guests", () => {
  it("creates a disabled participant profile without credentials or login verification", () => {
    expect(alex).toMatchObject({ name: "Alex", role: "guest", banned: true, emailVerified: false });
    expect(alex).not.toHaveProperty("password");
    expect(alex).not.toHaveProperty("session");
    expect(guestCountryId(alex.id)).toBe(country);
    expect(isGuestParticipantId("guest:fake")).toBe(false);
    expect(participantDisplayName(alex.id, alex.name)).toBe("Alex · Guest");
    expect(participantDisplayName("jy", "JY")).toBe("JY");
  });
  it("keeps two users and two guest shares individually identifiable and fully accounted for", () => {
    const shares = splitEqually(120, ["jy", "jh", alex.id, sam.id]);
    expect(shares).toHaveLength(4);
    expect(shares.every(share => Number(share.shareAmountBase) === 30)).toBe(true);
    const outstanding = calculateOutstandingSettlements(shares.map(share => ({ userId: share.userId, name: share.userId, paid: share.userId === "jy" ? 120 : 0, owed: Number(share.shareAmountBase) })), []);
    expect(outstanding).toHaveLength(3);
    expect(outstanding.map(row => row.fromUserId).sort()).toEqual(["jh", alex.id, sam.id].sort());
    expect(outstanding.every(row => row.toUserId === "jy" && row.amount === 30)).toBe(true);
  });
  it("preserves all cents when the bill does not divide exactly", () => {
    const shares = splitEqually(100, ["jy", "jh", alex.id, sam.id, "fifth"]);
    expect(shares.reduce((sum, share) => sum + Number(share.shareAmountBase), 0)).toBe(100);
    const odd = splitEqually(100, ["jy", alex.id, sam.id]);
    expect(odd.map(share => share.shareAmountBase).sort()).toEqual(["33.33", "33.33", "33.34"]);
  });
  it("lets the real payer reverse a manually recorded guest payment without weakening normal receiver confirmation", () => {
    expect(canReverseSettlement({ status: "SETTLED", fromUserId: "jy", toUserId: alex.id }, "jy", false)).toBe(true);
    expect(canReverseSettlement({ status: "SETTLED", fromUserId: "jy", toUserId: "jh" }, "jy", false)).toBe(false);
    expect(canReverseSettlement({ status: "SETTLED", fromUserId: "jy", toUserId: alex.id }, "stranger", false)).toBe(false);
  });
});
