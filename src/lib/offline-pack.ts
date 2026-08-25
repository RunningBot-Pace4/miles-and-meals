export const OFFLINE_PACK_STORAGE_KEY = "mnm:offline-pack:v2";
export const OFFLINE_PACKS_STORAGE_KEY = "mnm:offline-packs:v3";
export const OFFLINE_SELECTED_TRIP_STORAGE_KEY = "mnm:offline-selected-trip:v1";

export type OfflineTripMember = {
  id: string;
  name: string;
};

export type OfflineTravelItem = {
  id: string;
  type: string;
  title: string;
  date: string | null;
  time: string;
  area: string;
  status: string;
  provider: string;
  confirmationNo: string;
  notes: string;
};

export type OfflineReservation = {
  id: string;
  kind: string;
  title: string;
  provider: string;
  confirmationNo: string;
  date: string | null;
  time: string;
  status: string;
};

export type OfflineTripPack = {
  version: 2;
  savedAt: string;
  currentUserId: string;
  trip: {
    id: string;
    name: string;
    destination: string;
    countryId: string;
    currencyCode: string;
    baseCurrency: string;
    defaultExchangeRate: number;
    startDate: string | null;
    endDate: string | null;
    financialStatus: string;
  };
  members: OfflineTripMember[];
  plan: OfflineTravelItem[];
  reservations: OfflineReservation[];
};

export type OfflineTripOption = {
  id: string;
  name: string;
  destination: string;
  currencyCode: string;
  baseCurrency: string;
  financialStatus: string;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function validPack(value: unknown): value is OfflineTripPack {
  if (!value || typeof value !== "object") return false;
  const pack = value as Partial<OfflineTripPack>;
  return pack.version === 2 && Boolean(pack.trip?.id && pack.currentUserId);
}

function normalizePack(pack: OfflineTripPack): OfflineTripPack {
  return {
    ...pack,
    trip: {
      ...pack.trip,
      financialStatus: pack.trip.financialStatus ?? "OPEN",
    },
  };
}

export function readOfflinePacks(): OfflineTripPack[] {
  const localStorage = storage();
  if (!localStorage) return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_PACKS_STORAGE_KEY) ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      const packs = parsed.filter(validPack).map(normalizePack);
      if (packs.length) return packs;
    }

    const legacy = JSON.parse(localStorage.getItem(OFFLINE_PACK_STORAGE_KEY) ?? "null") as unknown;
    return validPack(legacy) ? [normalizePack(legacy)] : [];
  } catch {
    return [];
  }
}

export function readOfflinePack(tripId?: string): OfflineTripPack | null {
  const packs = readOfflinePacks();
  if (tripId) return packs.find((pack) => pack.trip.id === tripId) ?? null;
  const selectedId = readOfflineSelectedTripId();
  return packs.find((pack) => pack.trip.id === selectedId) ?? packs[0] ?? null;
}

export function readOfflineSelectedTripId(): string {
  return storage()?.getItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY) ?? "";
}

export function writeOfflineSelectedTripId(tripId: string): void {
  const localStorage = storage();
  if (!localStorage) return;
  localStorage.setItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY, tripId);
  window.dispatchEvent(new CustomEvent("mnm:offline-pack-updated"));
}

export function writeOfflinePack(pack: OfflineTripPack): void {
  const localStorage = storage();
  if (!localStorage) return;

  const next = [normalizePack(pack), ...readOfflinePacks().filter((item) => item.trip.id !== pack.trip.id)]
    .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))
    .slice(0, 12);

  localStorage.setItem(OFFLINE_PACKS_STORAGE_KEY, JSON.stringify(next));
  // Keep the selected single-pack mirror for the standalone offline shell and
  // for devices upgrading from Offline Pack 2.0.
  localStorage.setItem(OFFLINE_PACK_STORAGE_KEY, JSON.stringify(pack));
  localStorage.setItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY, pack.trip.id);
  window.dispatchEvent(new CustomEvent("mnm:offline-pack-updated"));
}

export function clearOfflinePack(): void {
  const localStorage = storage();
  if (!localStorage) return;
  try {
    localStorage.removeItem(OFFLINE_PACK_STORAGE_KEY);
    localStorage.removeItem(OFFLINE_PACKS_STORAGE_KEY);
    localStorage.removeItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("mnm:offline-pack-updated"));
  } catch {
    // Browser storage is best-effort.
  }
}
