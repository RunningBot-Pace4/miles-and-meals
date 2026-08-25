import { OfflinePackWorkspace } from "@/components/OfflinePackWorkspace";
import { requirePageSession } from "@/lib/session";
import { getActiveTripContext } from "@/lib/active-trip";

export default async function OfflinePackPage() {
  const session = await requirePageSession();
  const active = await getActiveTripContext(session.user);
  const trips = active.allCountries.map((country) => ({
    id: country.tripId,
    name: country.tripName,
    destination: country.name,
    currencyCode: country.currencyCode,
    baseCurrency: country.baseCurrency,
    financialStatus: country.financialStatus,
  }));
  return (
    <div className="stack gap-lg">
      <div className="page-heading"><div><p className="eyebrow">TRAVEL ANYWHERE</p><h1>Offline pack</h1><p className="muted">Keep the essentials available when airport Wi-Fi, roaming or underground connections disappear.</p></div></div>
      <OfflinePackWorkspace trips={trips} activeTripId={active.tripId} />
    </div>
  );
}
