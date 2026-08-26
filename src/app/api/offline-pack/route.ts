import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  countryMembers,
  expenses,
  expenseSplits,
  travelItems,
  tripBudgets,
  tripDocuments,
  tripEmergencyContacts,
  tripMemories,
  user,
} from "@/db/schema";
import { getActiveTripContext } from "@/lib/active-trip";
import type { OfflineTripPack } from "@/lib/offline-pack";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import type { SessionUser } from "@/lib/access";

async function buildPack(
  active: Awaited<ReturnType<typeof getActiveTripContext>>,
  targetTripId: string,
  currentUser: SessionUser,
): Promise<OfflineTripPack | null> {
  const country = active.allCountries.find((row) => row.tripId === targetTripId);

  if (!country || !targetTripId || country.financialStatus === "CLOSED") {
    return null;
  }

  const countryIds = active.allCountries
    .filter((row) => row.tripId === targetTripId)
    .map((row) => row.id);
  const capabilities = await getTripCapabilities(currentUser, targetTripId);
  if (!capabilities.canAccess) return null;

  const [memberRows, planRows, expenseRows, budgetRows, documentRows, emergencyRows, memoryRows] = await Promise.all([
    db
      .select({ id: user.id, name: user.name })
      .from(countryMembers)
      .innerJoin(user, eq(countryMembers.userId, user.id))
      .where(inArray(countryMembers.countryId, countryIds))
      .orderBy(asc(user.name)),
    db
      .select()
      .from(travelItems)
      .where(and(inArray(travelItems.countryId, countryIds), ne(travelItems.itemType, "BOOKING")))
      .orderBy(asc(travelItems.itemDate), asc(travelItems.itemTime)),
    db.select({
      id: expenses.id,
      date: expenses.expenseDate,
      category: expenses.category,
      description: expenses.description,
      currency: expenses.transactionCurrency,
      amount: expenses.transactionAmount,
      baseAmount: expenses.convertedAmount,
    }).from(expenses).where(eq(expenses.tripId, targetTripId)).orderBy(desc(expenses.expenseDate), desc(expenses.createdAt)).limit(80),
    db.select({ amount: tripBudgets.amount }).from(tripBudgets).where(and(
      eq(tripBudgets.tripId, targetTripId),
      eq(tripBudgets.userId, currentUser.id),
    )).limit(1),
    capabilities.canViewDocuments
      ? db.select().from(tripDocuments).where(eq(tripDocuments.tripId, targetTripId)).orderBy(desc(tripDocuments.createdAt))
      : Promise.resolve([]),
    db.select().from(tripEmergencyContacts).where(eq(tripEmergencyContacts.tripId, targetTripId)).orderBy(asc(tripEmergencyContacts.label)),
    db.select().from(tripMemories).where(eq(tripMemories.tripId, targetTripId)).orderBy(desc(tripMemories.occurredOn), desc(tripMemories.createdAt)).limit(24),
  ]);

  const expenseIds = expenseRows.map((expense) => expense.id);
  const splitRows = expenseIds.length
    ? await db.select({
      expenseId: expenseSplits.expenseId,
      userId: expenseSplits.userId,
      shareAmountBase: expenseSplits.shareAmountBase,
    }).from(expenseSplits).where(inArray(expenseSplits.expenseId, expenseIds))
    : [];
  const myShareByExpense = new Map(splitRows
    .filter((split) => split.userId === currentUser.id)
    .map((split) => [split.expenseId, Number(split.shareAmountBase)]));

  const members = [
    ...new Map(memberRows.map((member) => [member.id, member])).values(),
  ];

  const pack: OfflineTripPack = {
    version: 3,
    savedAt: new Date().toISOString(),
    currentUserId: currentUser.id,
    trip: {
      id: country.tripId,
      name: country.tripName,
      destination: country.name,
      countryId: country.id,
      currencyCode: country.currencyCode,
      baseCurrency: country.baseCurrency,
      defaultExchangeRate: Number(country.defaultExchangeRate),
      startDate: country.startDate,
      endDate: country.endDate,
      financialStatus: country.financialStatus,
    },
    members,
    plan: planRows.map((item) => ({
      id: item.id,
      type: item.itemType,
      title: item.title,
      date: item.itemDate,
      time: item.itemTime ?? "",
      area: item.area ?? "",
      status: item.status ?? "",
      provider: item.provider ?? "",
      confirmationNo: item.confirmationNo ?? "",
      notes: item.notes ?? "",
    })),
    expenses: expenseRows.map((expense) => ({
      id: expense.id,
      date: expense.date,
      category: expense.category,
      description: expense.description,
      currency: expense.currency,
      amount: Number(expense.amount),
      baseAmount: Number(expense.baseAmount),
      myShare: myShareByExpense.get(expense.id) ?? 0,
    })),
    finance: {
      baseCurrency: country.baseCurrency,
      myBudget: Number(budgetRows[0]?.amount ?? 0),
      groupSpent: expenseRows.reduce((total, expense) => total + Number(expense.baseAmount), 0),
      myShareSpent: [...myShareByExpense.values()].reduce((total, amount) => total + amount, 0),
    },
    documents: documentRows
      .filter((document) => document.visibility === "TRIP" || document.createdBy === currentUser.id)
      .map((document) => {
        const smallEnoughForDevice = Boolean(document.documentData && document.documentData.length <= 250_000);
        return {
          id: document.id,
          title: document.title,
          documentType: document.documentType,
          expiryDate: document.expiryDate,
          visibility: document.visibility,
          externalUrl: document.externalUrl ?? "",
          documentData: smallEnoughForDevice ? document.documentData ?? "" : "",
          offlineAvailable: smallEnoughForDevice,
        };
      }),
    emergencyContacts: emergencyRows.map((contact) => ({
      id: contact.id,
      label: contact.label,
      contactName: contact.contactName,
      phone: contact.phone,
      notes: contact.notes ?? "",
    })),
    memories: memoryRows.map((memory) => ({
      id: memory.id,
      title: memory.title,
      story: memory.story ?? "",
      place: memory.place ?? "",
      occurredOn: memory.occurredOn,
      photoData: memory.photoData && memory.photoData.length <= 250_000 ? memory.photoData : "",
    })),
  };

  return pack;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveTripContext(session.user);
  const parameters = new URL(request.url).searchParams;
  const requestedTripId = parameters.get("tripId") ?? "";

  if (parameters.get("all") === "1") {
    const tripIds = [...new Set(active.allCountries
      .filter((country) => country.financialStatus !== "CLOSED")
      .map((country) => country.tripId))];
    const packs = (await Promise.all(
      tripIds.map((tripId) => buildPack(active, tripId, session.user)),
    )).filter((pack): pack is OfflineTripPack => Boolean(pack));

    return Response.json({ packs }, { headers: { "cache-control": "private, no-store" } });
  }

  const targetTripId = requestedTripId || active.tripId;
  const pack = await buildPack(active, targetTripId, session.user);

  return Response.json({ pack }, { headers: { "cache-control": "private, no-store" } });
}
