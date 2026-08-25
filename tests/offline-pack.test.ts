import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OFFLINE_SELECTED_TRIP_STORAGE_KEY,
  readOfflinePacks,
  readOfflineSelectedTripId,
  writeOfflinePack,
  writeOfflinePacks,
  type OfflineTripPack,
} from "@/lib/offline-pack";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

function pack(id: string, savedAt: string): OfflineTripPack {
  return {
    version: 2,
    savedAt,
    currentUserId: "user-1",
    trip: {
      id,
      name: `Trip ${id}`,
      destination: `Destination ${id}`,
      countryId: `country-${id}`,
      currencyCode: "VND",
      baseCurrency: "MYR",
      defaultExchangeRate: 0.00016,
      startDate: "2026-08-25",
      endDate: "2026-08-29",
      financialStatus: "OPEN",
    },
    members: [],
    plan: [],
    reservations: [],
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("window", {
    localStorage: memoryStorage(),
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string) {} });
});

describe("multi-Trip offline packs", () => {
  it("stores every accessible Trip without changing the remembered selection", () => {
    writeOfflinePack(pack("one", "2026-08-25T01:00:00.000Z"));
    window.localStorage.setItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY, "one");

    writeOfflinePacks([
      pack("one", "2026-08-25T02:00:00.000Z"),
      pack("two", "2026-08-25T02:00:00.000Z"),
    ], "", true);

    expect(readOfflinePacks().map((item) => item.trip.id).sort()).toEqual(["one", "two"]);
    expect(readOfflineSelectedTripId()).toBe("one");
  });

  it("removes packs that are no longer accessible during a full refresh", () => {
    writeOfflinePacks([
      pack("one", "2026-08-25T01:00:00.000Z"),
      pack("removed", "2026-08-25T01:00:00.000Z"),
    ]);

    writeOfflinePacks([pack("one", "2026-08-25T02:00:00.000Z")], "", true);

    expect(readOfflinePacks().map((item) => item.trip.id)).toEqual(["one"]);
  });
});
