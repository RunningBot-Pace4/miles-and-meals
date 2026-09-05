import type {
  SettlementLiveData,
  SerializedSettlementRecord,
} from "@/lib/settlement-live";

export type IndividualPaymentStatus =
  | "DUE"
  | "PARTIAL"
  | "PARTIAL_PENDING"
  | "PENDING_CONFIRMATION"
  | "SETTLED";

export type IndividualPaymentTransaction = {
  id: string;
  sequence: number;
  amount: number;
  currency: string;
  sentAt: string;
  confirmedAt: string | null;
  confirmationStatus: "PENDING" | "CONFIRMED";
  progressStatus: "PARTIAL" | "FULL";
  remainingAfter: number;
};

export type IndividualPaymentLedger = {
  key: string;
  countryId: string;
  tripId: string;
  tripName: string;
  currency: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  direction: "PAY" | "RECEIVE";
  counterpartyUserId: string;
  counterpartyName: string;
  totalAmount: number;
  confirmedAmount: number;
  pendingAmount: number;
  remainingAmount: number;
  openAmount: number;
  transactionCount: number;
  pendingCount: number;
  settledCount: number;
  status: IndividualPaymentStatus;
  transactions: IndividualPaymentTransaction[];
};

type WorkingLedger = Omit<
  IndividualPaymentLedger,
  | "totalAmount"
  | "confirmedAmount"
  | "pendingAmount"
  | "openAmount"
  | "transactionCount"
  | "pendingCount"
  | "settledCount"
  | "status"
  | "transactions"
> & {
  paymentRows: SerializedSettlementRecord[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ledgerKey(input: {
  countryId: string;
  fromUserId: string;
  toUserId: string;
  currency: string;
}): string {
  return [
    input.countryId,
    input.fromUserId,
    input.toUserId,
    input.currency,
  ].join("\u0000");
}

function resolveStatus(input: {
  confirmedAmount: number;
  pendingAmount: number;
  remainingAmount: number;
}): IndividualPaymentStatus {
  if (input.pendingAmount > 0.005) {
    return input.remainingAmount > 0.005
      ? "PARTIAL_PENDING"
      : "PENDING_CONFIRMATION";
  }

  if (input.remainingAmount > 0.005) {
    return input.confirmedAmount > 0.005
      ? "PARTIAL"
      : "DUE";
  }

  return "SETTLED";
}

/**
 * Builds the current user's person-to-person payment ledger from the canonical
 * settlement rows. A SENT row is a real payment transaction awaiting receiver
 * confirmation, while a SETTLED row is confirmed and view only.
 *
 * `remainingAmount` is money that has not been recorded as paid yet.
 * `openAmount` also includes payments that are still awaiting confirmation.
 */
export function buildIndividualPaymentLedgers(
  data: SettlementLiveData,
  currentUserId: string,
): IndividualPaymentLedger[] {
  const ledgers = new Map<string, WorkingLedger>();

  function ensureLedger(input: {
    countryId: string;
    tripId: string;
    tripName: string;
    currency: string;
    fromUserId: string;
    fromName: string;
    toUserId: string;
    toName: string;
  }): WorkingLedger | null {
    if (
      input.fromUserId !== currentUserId &&
      input.toUserId !== currentUserId
    ) {
      return null;
    }

    const key = ledgerKey(input);
    const existing = ledgers.get(key);

    if (existing) {
      return existing;
    }

    const direction = input.fromUserId === currentUserId
      ? "PAY"
      : "RECEIVE";
    const ledger: WorkingLedger = {
      key,
      countryId: input.countryId,
      tripId: input.tripId,
      tripName: input.tripName,
      currency: input.currency,
      fromUserId: input.fromUserId,
      fromName: input.fromName,
      toUserId: input.toUserId,
      toName: input.toName,
      direction,
      counterpartyUserId:
        direction === "PAY" ? input.toUserId : input.fromUserId,
      counterpartyName:
        direction === "PAY" ? input.toName : input.fromName,
      remainingAmount: 0,
      paymentRows: [],
    };

    ledgers.set(key, ledger);
    return ledger;
  }

  const paymentRows = [
    ...data.pendingSettlements,
    ...data.settledSettlements,
  ];

  for (const payment of paymentRows) {
    const ledger = ensureLedger(payment);

    if (ledger) {
      ledger.paymentRows.push(payment);
    }
  }

  for (const transfer of data.waitingTransfers) {
    const ledger = ensureLedger(transfer);

    if (ledger) {
      ledger.remainingAmount = roundMoney(
        ledger.remainingAmount + transfer.amount,
      );
    }
  }

  return [...ledgers.values()]
    .map((ledger): IndividualPaymentLedger => {
      const orderedRows = [...ledger.paymentRows].sort((left, right) => {
        const dateDifference =
          new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime();

        return dateDifference || left.id.localeCompare(right.id);
      });
      const confirmedAmount = roundMoney(
        orderedRows
          .filter((payment) => payment.status === "SETTLED")
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
      const pendingAmount = roundMoney(
        orderedRows
          .filter((payment) => payment.status === "SENT")
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
      const totalAmount = roundMoney(
        confirmedAmount + pendingAmount + ledger.remainingAmount,
      );
      let runningRemaining = totalAmount;

      const transactions = orderedRows.map(
        (payment, index): IndividualPaymentTransaction => {
          runningRemaining = roundMoney(
            Math.max(0, runningRemaining - payment.amount),
          );

          return {
            id: payment.id,
            sequence: index + 1,
            amount: payment.amount,
            currency: payment.currency,
            sentAt: payment.sentAt,
            confirmedAt: payment.confirmedAt,
            confirmationStatus:
              payment.status === "SETTLED" ? "CONFIRMED" : "PENDING",
            progressStatus:
              runningRemaining > 0.005 ? "PARTIAL" : "FULL",
            remainingAfter: runningRemaining,
          };
        },
      );
      const pendingCount = orderedRows.filter(
        (payment) => payment.status === "SENT",
      ).length;
      const settledCount = orderedRows.length - pendingCount;

      return {
        key: ledger.key,
        countryId: ledger.countryId,
        tripId: ledger.tripId,
        tripName: ledger.tripName,
        currency: ledger.currency,
        fromUserId: ledger.fromUserId,
        fromName: ledger.fromName,
        toUserId: ledger.toUserId,
        toName: ledger.toName,
        direction: ledger.direction,
        counterpartyUserId: ledger.counterpartyUserId,
        counterpartyName: ledger.counterpartyName,
        totalAmount,
        confirmedAmount,
        pendingAmount,
        remainingAmount: ledger.remainingAmount,
        openAmount: roundMoney(pendingAmount + ledger.remainingAmount),
        transactionCount: orderedRows.length,
        pendingCount,
        settledCount,
        status: resolveStatus({
          confirmedAmount,
          pendingAmount,
          remainingAmount: ledger.remainingAmount,
        }),
        transactions,
      };
    })
    .filter((ledger) => ledger.totalAmount > 0.005)
    .sort((left, right) => {
      if (left.openAmount !== right.openAmount) {
        return right.openAmount - left.openAmount;
      }

      if (left.tripName !== right.tripName) {
        return left.tripName.localeCompare(right.tripName);
      }

      return left.counterpartyName.localeCompare(right.counterpartyName);
    });
}
