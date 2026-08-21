import type { ActiveTripContext } from "@/lib/active-trip";
import { buildExpenseSummary, type PersonExpenseSummary } from "@/lib/dashboard";
import { getDailyFxRate } from "@/lib/fx";
import type {
  CountrySettlementTransfer,
  SettlementRecordView,
} from "@/lib/settlement-ledger";
import { serializeSettlementLiveData, type SettlementLiveData } from "@/lib/settlement-live";
import { loadTripBudgetSummary } from "@/lib/trip-budget";

export type DashboardFinanceData = {
  total: number;
  categories: Array<{
    category: string;
    amount: number;
  }>;
  baseCurrency: string;
  myBudget: number;
  myShareSpent: number;
  myRemaining: number;
  combinedBudget: number;
  groupRemaining: number;
  budgetsSubmitted: number;
  travelerCount: number;
};

export type AllTripsDashboardData = {
  finance: DashboardFinanceData;
  settlement: SettlementLiveData;
  tripCount: number;
  destinationCount: number;
};

type ExpenseSummary = Awaited<ReturnType<typeof buildExpenseSummary>>;

type FxCacheEntry = {
  rate: number;
  expiresAt: number;
};

const FX_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const fxCache = new Map<string, FxCacheEntry>();

function pickDisplayCurrency(activeTrip: ActiveTripContext): string {
  const activeCurrency = activeTrip.trips.find(
    (trip) => trip.id === activeTrip.tripId,
  )?.baseCurrency;

  if (activeCurrency) {
    return activeCurrency;
  }

  return activeTrip.trips[0]?.baseCurrency ?? "MYR";
}

async function getConversionRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();

  if (from === to) {
    return 1;
  }

  const key = `${from}:${to}`;
  const now = Date.now();
  const cached = fxCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.rate;
  }

  const rate = await getDailyFxRate(from, to);

  fxCache.set(key, {
    rate: rate.rate,
    expiresAt: now + FX_CACHE_TTL_MS,
  });

  return rate.rate;
}

function addCategory(
  target: Map<string, number>,
  category: string,
  amount: number,
) {
  target.set(
    category,
    (target.get(category) ?? 0) + amount,
  );
}

function emptyPerson(source: PersonExpenseSummary): PersonExpenseSummary {
  return {
    userId: source.userId,
    name: source.name,
    paid: 0,
    share: 0,
    balanceBeforeSettlement: 0,
    toPay: 0,
    toReceive: 0,
    paymentSent: 0,
    awaitingConfirmation: 0,
    settledPaid: 0,
    settledReceived: 0,
    totalSettlementPaid: 0,
    totalSettlementReceived: 0,
    confirmedBalance: 0,
    ledgerBalance: 0,
  };
}

function mergePerson(
  target: Map<string, PersonExpenseSummary>,
  source: PersonExpenseSummary,
  factor: number,
) {
  const current = target.get(source.userId) ?? emptyPerson(source);

  current.paid += source.paid * factor;
  current.share += source.share * factor;
  current.balanceBeforeSettlement += source.balanceBeforeSettlement * factor;
  current.toPay += source.toPay * factor;
  current.toReceive += source.toReceive * factor;
  current.paymentSent += source.paymentSent * factor;
  current.awaitingConfirmation += source.awaitingConfirmation * factor;
  current.settledPaid += source.settledPaid * factor;
  current.settledReceived += source.settledReceived * factor;
  current.totalSettlementPaid += source.totalSettlementPaid * factor;
  current.totalSettlementReceived += source.totalSettlementReceived * factor;
  current.confirmedBalance += source.confirmedBalance * factor;
  current.ledgerBalance += source.ledgerBalance * factor;

  target.set(source.userId, current);
}

function convertTransfer(
  transfer: CountrySettlementTransfer,
  factor: number,
  displayCurrency: string,
): CountrySettlementTransfer {
  return {
    ...transfer,
    amount: transfer.amount * factor,
    currency: displayCurrency,
  };
}

function convertSettlement(
  settlement: SettlementRecordView,
  factor: number,
  displayCurrency: string,
): SettlementRecordView {
  return {
    ...settlement,
    amount: settlement.amount * factor,
    currency: displayCurrency,
  };
}

function sortSettlements(rows: SettlementRecordView[]) {
  return rows.sort((left, right) => right.sentAt.getTime() - left.sentAt.getTime());
}

export async function loadAllTripsDashboardData(
  currentUserId: string,
  activeTrip: ActiveTripContext,
): Promise<AllTripsDashboardData> {
  const displayCurrency = pickDisplayCurrency(activeTrip);
  const categories = new Map<string, number>();
  const people = new Map<string, PersonExpenseSummary>();
  const waitingTransfers: CountrySettlementTransfer[] = [];
  const pendingSettlements: SettlementRecordView[] = [];
  const settledSettlements: SettlementRecordView[] = [];

  let total = 0;
  let myBudget = 0;
  let myShareSpent = 0;
  let combinedBudget = 0;
  let budgetsSubmitted = 0;
  let travelerCount = 0;

  const tripRows = await Promise.all(
    activeTrip.trips.map(async (trip) => {
      const tripCountries = activeTrip.allCountries.filter(
        (country) => country.tripId === trip.id,
      );
      const countryIds = tripCountries.map((country) => country.id);
      const [summary, budget, factor] = await Promise.all([
        buildExpenseSummary(countryIds),
        loadTripBudgetSummary(currentUserId, trip.id, countryIds),
        getConversionRate(trip.baseCurrency, displayCurrency),
      ]);

      return {
        summary,
        budget,
        factor,
      };
    }),
  );

  for (const row of tripRows) {
    const { summary, budget, factor } = row;

    total += summary.total * factor;
    myBudget += budget.myBudget * factor;
    combinedBudget += budget.combinedBudget * factor;
    budgetsSubmitted += budget.budgetsSubmitted;
    travelerCount += budget.travelerCount;

    const me = summary.people.find((person) => person.userId === currentUserId);
    myShareSpent += (me?.share ?? 0) * factor;

    for (const category of summary.categories) {
      addCategory(categories, category.category, category.amount * factor);
    }

    for (const person of summary.people) {
      mergePerson(people, person, factor);
    }

    waitingTransfers.push(
      ...summary.waitingTransfers.map((transfer) =>
        convertTransfer(transfer, factor, displayCurrency),
      ),
    );
    pendingSettlements.push(
      ...summary.pendingSettlements.map((settlement) =>
        convertSettlement(settlement, factor, displayCurrency),
      ),
    );
    settledSettlements.push(
      ...summary.settledSettlements.map((settlement) =>
        convertSettlement(settlement, factor, displayCurrency),
      ),
    );
  }

  const aggregateSummary: Pick<
    ExpenseSummary,
    "people" | "waitingTransfers" | "pendingSettlements" | "settledSettlements"
  > = {
    people: [...people.values()].sort((left, right) => left.name.localeCompare(right.name)),
    waitingTransfers,
    pendingSettlements: sortSettlements(pendingSettlements),
    settledSettlements: sortSettlements(settledSettlements),
  };

  const finance: DashboardFinanceData = {
    total,
    categories: [...categories.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount),
    baseCurrency: displayCurrency,
    myBudget,
    myShareSpent,
    myRemaining: myBudget - myShareSpent,
    combinedBudget,
    groupRemaining: combinedBudget - total,
    budgetsSubmitted,
    travelerCount,
  };

  return {
    finance,
    settlement: serializeSettlementLiveData(aggregateSummary, displayCurrency),
    tripCount: activeTrip.trips.length,
    destinationCount: activeTrip.allCountries.length,
  };
}
