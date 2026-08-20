import type { PersonExpenseSummary } from "@/lib/dashboard";
import type {
  CountrySettlementTransfer,
  SettlementRecordView,
} from "@/lib/settlement-ledger";

export type SerializedSettlementRecord = Omit<
  SettlementRecordView,
  "sentAt" | "confirmedAt"
> & {
  sentAt: string;
  confirmedAt: string | null;
};

export type SettlementLiveData = {
  baseCurrency: string;
  people: PersonExpenseSummary[];
  waitingTransfers: CountrySettlementTransfer[];
  pendingSettlements: SerializedSettlementRecord[];
  settledSettlements: SerializedSettlementRecord[];
};

type SettlementSummaryLike = {
  people: PersonExpenseSummary[];
  waitingTransfers: CountrySettlementTransfer[];
  pendingSettlements: SettlementRecordView[];
  settledSettlements: SettlementRecordView[];
};

export function serializeSettlementLiveData(
  summary: SettlementSummaryLike,
  baseCurrency: string,
): SettlementLiveData {
  return {
    baseCurrency,
    people: summary.people,
    waitingTransfers:
      summary.waitingTransfers,
    pendingSettlements:
      summary.pendingSettlements.map(
        (payment) => ({
          ...payment,
          sentAt:
            payment.sentAt.toISOString(),
          confirmedAt:
            payment.confirmedAt?.toISOString() ??
            null,
        }),
      ),
    settledSettlements:
      summary.settledSettlements.map(
        (payment) => ({
          ...payment,
          sentAt:
            payment.sentAt.toISOString(),
          confirmedAt:
            payment.confirmedAt?.toISOString() ??
            null,
        }),
      ),
  };
}
