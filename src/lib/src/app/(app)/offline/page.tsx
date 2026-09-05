import { OfflinePackWorkspace } from "@/components/OfflinePackWorkspace";
import { OfflineSyncHealth } from "@/components/OfflineSyncHealth";
import { requirePageSession } from "@/lib/session";
import { getActiveTripContext } from "@/lib/active-trip";

export default async function OfflinePackPage() {
  const session = await requirePageSession();
  const active = await getActiveTripContext(session.user);
  const trips = [...new Map(active.allCountries
    .filter((country) => country.financialStatus !== "CLOSED")
    .map((country) => [country.tripId, {
    id: country.tripId,
    name: country.tripName,
    destination: country.name,
    currencyCode: country.currencyCode,
    baseCurrency: country.baseCurrency,
    financialStatus: country.financialStatus,
  }])).values()];
  return (
    <div className="stack gap-lg">
      <div className="page-heading"><div><p className="eyebrow">TRAVEL ANYWHERE</p><h1>Offline packs</h1><p className="muted">Your open Trips are refreshed on this device while online, so you can choose the correct Trip, currency and ledger after the connection disappears. Closed Trips are removed automatically.</p></div></div>
      <OfflinePackWorkspace trips={trips} activeTripId={active.tripId} />
      <OfflineSyncHealth />
    </div>
  );
}
