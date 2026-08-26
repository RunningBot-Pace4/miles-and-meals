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

function isOpenPack(pack: OfflineTripPack): boolean {
  return pack.trip.financialStatus !== "CLOSED";
}

function repairStoredOpenPacks(
  localStorage: Storage,
  candidates: OfflineTripPack[],
  openPacks: OfflineTripPack[],
): void {
  if (candidates.length === openPacks.length) return;

  const previousSelectedId = localStorage.getItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY) ?? "";
  const selectedPack =
    openPacks.find((pack) => pack.trip.id === previousSelectedId) ??
    openPacks[0];

  localStorage.setItem(OFFLINE_PACKS_STORAGE_KEY, JSON.stringify(openPacks));
  if (selectedPack) {
    localStorage.setItem(OFFLINE_PACK_STORAGE_KEY, JSON.stringify(selectedPack));
    localStorage.setItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY, selectedPack.trip.id);
  } else {
    localStorage.removeItem(OFFLINE_PACK_STORAGE_KEY);
    localStorage.removeItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY);
  }
}

export function readOfflinePacks(): OfflineTripPack[] {
  const localStorage = storage();
  if (!localStorage) return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_PACKS_STORAGE_KEY) ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      const candidates = parsed.filter(validPack).map(normalizePack);
      if (candidates.length) {
        const openPacks = candidates.filter(isOpenPack);
        repairStoredOpenPacks(localStorage, candidates, openPacks);
        return openPacks;
      }
    }

    const legacy = JSON.parse(localStorage.getItem(OFFLINE_PACK_STORAGE_KEY) ?? "null") as unknown;
    if (!validPack(legacy)) return [];
    const normalizedLegacy = normalizePack(legacy);
    if (isOpenPack(normalizedLegacy)) return [normalizedLegacy];
    repairStoredOpenPacks(localStorage, [normalizedLegacy], []);
    return [];
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
  writeOfflinePacks([pack], pack.trip.id);
}

export function writeOfflinePacks(
  incoming: OfflineTripPack[],
  selectedTripId = "",
  replaceExisting = false,
): void {
  const localStorage = storage();
  if (!localStorage) return;

  const normalizedIncoming = incoming.map(normalizePack);
  const incomingIds = new Set(normalizedIncoming.map((pack) => pack.trip.id));
  const retained = replaceExisting
    ? []
    : readOfflinePacks().filter((item) => !incomingIds.has(item.trip.id));
  const next = [...normalizedIncoming.filter(isOpenPack), ...retained]
    .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt));

  const previousSelectedId = readOfflineSelectedTripId();
  const nextSelectedId =
    (selectedTripId && next.some((pack) => pack.trip.id === selectedTripId) && selectedTripId) ||
    (previousSelectedId && next.some((pack) => pack.trip.id === previousSelectedId) && previousSelectedId) ||
    next[0]?.trip.id ||
    "";
  const selectedPack = next.find((pack) => pack.trip.id === nextSelectedId) ?? next[0];

  localStorage.setItem(OFFLINE_PACKS_STORAGE_KEY, JSON.stringify(next));
  // Keep the selected single-pack mirror for the standalone offline shell and
  // for devices upgrading from Offline Pack 2.0.
  if (selectedPack) {
    localStorage.setItem(OFFLINE_PACK_STORAGE_KEY, JSON.stringify(selectedPack));
    localStorage.setItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY, selectedPack.trip.id);
  } else {
    localStorage.removeItem(OFFLINE_PACK_STORAGE_KEY);
    localStorage.removeItem(OFFLINE_SELECTED_TRIP_STORAGE_KEY);
  }
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
