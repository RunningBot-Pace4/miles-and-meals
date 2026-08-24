export const OFFLINE_PACK_STORAGE_KEY = "mnm:offline-pack:v2";

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
  };
  members: OfflineTripMember[];
  plan: OfflineTravelItem[];
  reservations: OfflineReservation[];
};

export function readOfflinePack(): OfflineTripPack | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(OFFLINE_PACK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OfflineTripPack>;
    if (parsed.version !== 2 || !parsed.trip?.id || !parsed.currentUserId) return null;
    return parsed as OfflineTripPack;
  } catch {
    return null;
  }
}

export function writeOfflinePack(pack: OfflineTripPack): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFLINE_PACK_STORAGE_KEY, JSON.stringify(pack));
  window.dispatchEvent(new CustomEvent("mnm:offline-pack-updated"));
}

export function clearOfflinePack(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(OFFLINE_PACK_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("mnm:offline-pack-updated"));
  } catch {
    // Browser storage is best-effort.
  }
}
