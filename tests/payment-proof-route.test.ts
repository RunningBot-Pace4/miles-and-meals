import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getTripCapabilities: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/trip-capabilities", () => ({ getTripCapabilities: mocks.getTripCapabilities }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

import { GET } from "@/app/api/settlements/[id]/proof/route";

const payment = {
  tripId: "trip-1",
  fromUserId: "payer",
  toUserId: "receiver",
  paymentProofData: "data:image/png;base64,aGVsbG8=",
};

function request() {
  return GET(new Request("https://example.test/api/settlements/payment-1/proof"), {
    params: Promise.resolve({ id: "payment-1" }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "payer", role: "USER" } });
  mocks.getTripCapabilities.mockResolvedValue({ canAccess: true, canManage: false });
  mocks.limit.mockResolvedValue([payment]);
  mocks.select.mockReturnValue({
    from: () => ({ where: () => ({ limit: mocks.limit }) }),
  });
});

describe("payment proof access", () => {
  it("requires authentication before reading payment data", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await request()).status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown payment", async () => {
    mocks.limit.mockResolvedValue([]);
    expect((await request()).status).toBe(404);
  });

  it.each(["payer", "receiver"])("allows the %s to view proof", async (id) => {
    mocks.getSession.mockResolvedValue({ user: { id } });
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(mocks.getTripCapabilities).toHaveBeenCalledWith({ id }, "trip-1");
  });

  it("allows a trip manager", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "manager" } });
    mocks.getTripCapabilities.mockResolvedValue({ canAccess: true, canManage: true });
    expect((await request()).status).toBe(200);
  });

  it.each([true, false])("denies unrelated users even with trip access=%s", async (canAccess) => {
    mocks.getSession.mockResolvedValue({ user: { id: "unrelated" } });
    mocks.getTripCapabilities.mockResolvedValue({ canAccess, canManage: false });
    expect((await request()).status).toBe(403);
  });

  it("returns 404 when proof is absent", async () => {
    mocks.limit.mockResolvedValue([{ ...payment, paymentProofData: null }]);
    expect((await request()).status).toBe(404);
  });

  it("rejects non-image proof content", async () => {
    mocks.limit.mockResolvedValue([{ ...payment, paymentProofData: "data:text/html;base64,aGVsbG8=" }]);
    expect((await request()).status).toBe(422);
  });

  it.each([["jpeg", "jpg"], ["png", "png"], ["webp", "webp"]])(
    "serves %s with the matching filename extension",
    async (format, extension) => {
      mocks.limit.mockResolvedValue([{ ...payment, paymentProofData: `data:image/${format};base64,aGVsbG8=` }]);
      const response = await request();
      expect(response.headers.get("content-type")).toBe(`image/${format}`);
      expect(response.headers.get("content-disposition")).toBe(`inline; filename="payment-proof.${extension}"`);
    },
  );
});
