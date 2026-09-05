import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { db } from "@/db";
import { expenses, travelItems, tripDocuments, tripEmergencyContacts, tripMemories } from "@/db/schema";
import { getActiveTripContext } from "@/lib/active-trip";
import { buildExpenseSummary } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import { requirePageSession } from "@/lib/session";
import { loadTripBudgetSummary } from "@/lib/trip-budget";
import { buildCompanionSuggestions } from "@/lib/trip-companion";
import { loadTripCommandCenter } from "@/lib/trip-command-center";
import { getTripCapabilities } from "@/lib/trip-capabilities";

export default async function CompanionPage() {
  const session = await requirePageSession();
  const active = await getActiveTripContext(session.user);
  const trip = active.trips.find((item) => item.id === active.tripId) ?? null;
  const countryIds = active.countries.map((country) => country.id);
  if (!trip || !countryIds.length) return <section className="empty-card"><h1>No active Trip</h1><p>Create or select a Trip to use the companion.</p><Link className="button primary" href="/trips">Open Trips</Link></section>;

  const capabilities = await getTripCapabilities(session.user, trip.id);
  const [plan, documentRows, contactRows, memoryRows, receiptRows, budget, summary] = await Promise.all([
    db.select().from(travelItems).where(inArray(travelItems.countryId, countryIds)),
    capabilities.canViewDocuments
      ? db.select({ documentType: tripDocuments.documentType, expiryDate: tripDocuments.expiryDate }).from(tripDocuments).where(and(
          eq(tripDocuments.tripId, trip.id),
          or(eq(tripDocuments.visibility, "TRIP"), eq(tripDocuments.createdBy, session.user.id)),
        ))
      : Promise.resolve([]),
    db.select({ id: tripEmergencyContacts.id }).from(tripEmergencyContacts).where(eq(tripEmergencyContacts.tripId, trip.id)),
    db.select({ id: tripMemories.id }).from(tripMemories).where(eq(tripMemories.tripId, trip.id)),
    db.select({ id: expenses.id }).from(expenses).where(and(inArray(expenses.countryId, countryIds), ne(expenses.receiptReviewStatus, "REVIEWED"), sql`${expenses.receiptUrl} is not null`)),
    loadTripBudgetSummary(session.user.id, trip.id, countryIds),
    buildExpenseSummary(countryIds),
  ]);
  const me = summary.people.find((person) => person.userId === session.user.id);
  const command = await loadTripCommandCenter({ tripId: trip.id, countryIds, userId: session.user.id, startDate: trip.startDate, endDate: trip.endDate, financialStatus: trip.financialStatus, myBudget: budget.myBudget, myShareSpent: me?.share ?? 0 });
  const now = Date.now();
  const expiringDocumentCount = documentRows.filter((document) => {
    if (!document.expiryDate) return false;
    const remaining = new Date(`${document.expiryDate}T00:00:00Z`).getTime() - now;
    return remaining >= 0 && remaining <= 45 * 86_400_000;
  }).length;
  const itinerary = plan.filter((item) => item.itemType === "ITINERARY");
  const open = (type: string) => plan.filter((item) => item.itemType === type && item.status !== "Done").length;
  const suggestions = buildCompanionSuggestions({
    stage: command?.stage ?? "BEFORE",
    emergencyContactCount: contactRows.length,
    documentTypes: documentRows.map((item) => item.documentType),
    expiringDocumentCount,
    openPackingCount: open("PACKING"),
    openTaskCount: open("CHECKLIST"),
    itineraryCount: itinerary.length,
    itineraryMissingTimeCount: itinerary.filter((item) => !item.itemTime).length,
    itineraryMissingAreaCount: itinerary.filter((item) => !item.area).length,
    receiptReviewCount: receiptRows.length,
    forecastOver: command?.forecastOver ?? false,
    outstandingAmount: (me?.toPay ?? 0) + (me?.toReceive ?? 0),
    memoryCount: memoryRows.length,
  });

  return <div className="stack gap-lg companion-page">
    <section className="panel companion-hero"><div><p className="eyebrow">V90 TRIP COMPANION · EXPLAINABLE</p><h1>{suggestions.length ? `${suggestions.length} useful next step${suggestions.length === 1 ? "" : "s"}` : "You are travel-ready"}</h1><p>Suggestions come from your Trip dates, Plan, budget, receipts, safety details and settlement—not hidden advertising.</p></div><span className={`trip-stage-badge ${(command?.stage ?? "BEFORE").toLowerCase()}`}>{command?.stage ?? "Before"}</span></section>
    <section className="companion-stats"><article><strong>{itinerary.length}</strong><span>Activities</span></article><article><strong>{documentRows.length}</strong><span>Documents</span></article><article><strong>{formatMoney(command?.dailyAllowance ?? 0, trip.baseCurrency)}</strong><span>Daily allowance</span></article><article><strong>{formatMoney((me?.toPay ?? 0) + (me?.toReceive ?? 0), trip.baseCurrency)}</strong><span>Open settlement</span></article></section>
    <section className="companion-suggestions">{suggestions.map((suggestion) => <Link className={`companion-card ${suggestion.priority.toLowerCase()}`} href={suggestion.href} key={suggestion.id}><span>{suggestion.priority}</span><div><h2>{suggestion.title}</h2><p>{suggestion.detail}</p><strong>{suggestion.action} →</strong></div></Link>)}{!suggestions.length ? <article className="empty-card"><h2>No urgent gaps detected</h2><p>Keep the offline pack fresh and enjoy the Trip.</p><Link className="button secondary" href="/offline">Check offline pack</Link></article> : null}</section>
    <section className="panel companion-discovery"><p className="eyebrow">USEFUL NEARBY</p><h2>Fast discovery</h2><div>{[["Top sights", "top attractions"], ["Local food", "best local food"], ["Rainy-day ideas", "indoor attractions"], ["Hospital", "hospital"], ["Embassy", "embassy"]].map(([label, query]) => <a key={label} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} in ${active.countries[0]?.name ?? trip.name}`)}`} target="_blank" rel="noreferrer">{label} ↗</a>)}</div></section>
  </div>;
}
