export type SettlementInput = {
  userId: string;
  name: string;
  paid: number;
  owed: number;
};

export type SettlementTransfer = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
};

export type RecordedSettlement = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

const CENT_TOLERANCE = 0.005;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateSettlements(
  input: SettlementInput[],
): SettlementTransfer[] {
  const debtors = input
    .map((person) => ({
      ...person,
      balance:
        person.paid - person.owed,
    }))
    .filter(
      (person) =>
        person.balance <
        -CENT_TOLERANCE,
    )
    .sort(
      (left, right) =>
        left.balance - right.balance,
    );

  const creditors = input
    .map((person) => ({
      ...person,
      balance:
        person.paid - person.owed,
    }))
    .filter(
      (person) =>
        person.balance >
        CENT_TOLERANCE,
    )
    .sort(
      (left, right) =>
        right.balance - left.balance,
    );

  const transfers: SettlementTransfer[] =
    [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (
    debtorIndex < debtors.length &&
    creditorIndex < creditors.length
  ) {
    const debtor = debtors[debtorIndex];
    const creditor =
      creditors[creditorIndex];

    const amount = Math.min(
      -debtor.balance,
      creditor.balance,
    );
    const rounded =
      roundMoney(amount);

    if (rounded > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: rounded,
      });
    }

    debtor.balance += rounded;
    creditor.balance -= rounded;

    if (
      Math.abs(debtor.balance) <
      CENT_TOLERANCE
    ) {
      debtorIndex += 1;
    }

    if (
      Math.abs(creditor.balance) <
      CENT_TOLERANCE
    ) {
      creditorIndex += 1;
    }
  }

  return transfers;
}

type PairLedger = {
  firstUserId: string;
  secondUserId: string;
  signedAmount: number;
};

function pairKey(
  firstUserId: string,
  secondUserId: string,
): {
  key: string;
  firstUserId: string;
  secondUserId: string;
  direction: 1 | -1;
} {
  if (
    firstUserId.localeCompare(
      secondUserId,
    ) <= 0
  ) {
    return {
      key: `${firstUserId}\u0000${secondUserId}`,
      firstUserId,
      secondUserId,
      direction: 1,
    };
  }

  return {
    key: `${secondUserId}\u0000${firstUserId}`,
    firstUserId: secondUserId,
    secondUserId: firstUserId,
    direction: -1,
  };
}

function addPairAmount(
  ledger: Map<string, PairLedger>,
  fromUserId: string,
  toUserId: string,
  amount: number,
): void {
  if (
    fromUserId === toUserId ||
    amount <= CENT_TOLERANCE
  ) {
    return;
  }

  const pair = pairKey(
    fromUserId,
    toUserId,
  );
  const current = ledger.get(
    pair.key,
  ) ?? {
    firstUserId: pair.firstUserId,
    secondUserId:
      pair.secondUserId,
    signedAmount: 0,
  };

  current.signedAmount +=
    amount * pair.direction;

  ledger.set(pair.key, current);
}

/**
 * Reconciles today's ideal settlement routes against payments that were
 * already sent/received.
 *
 * Historical payments stay attached to the same two people. If an expense is
 * edited after somebody already paid, any excess is returned by that original
 * receiver instead of silently rerouting the old payment through another
 * traveler.
 */
export function calculateOutstandingSettlements(
  input: SettlementInput[],
  recorded: RecordedSettlement[],
): SettlementTransfer[] {
  const currentTarget =
    calculateSettlements(input);
  const names = new Map(
    input.map((person) => [
      person.userId,
      person.name,
    ]),
  );
  const pairLedger = new Map<
    string,
    PairLedger
  >();

  for (const transfer of currentTarget) {
    addPairAmount(
      pairLedger,
      transfer.fromUserId,
      transfer.toUserId,
      transfer.amount,
    );
  }

  for (const payment of recorded) {
    /*
     * A historical A → B payment reduces any current A → B debt.
     * If that debt no longer exists, B → A becomes the refund direction.
     */
    addPairAmount(
      pairLedger,
      payment.toUserId,
      payment.fromUserId,
      payment.amount,
    );
  }

  return [...pairLedger.values()]
    .map(
      (
        pair,
      ): SettlementTransfer | null => {
        const amount = roundMoney(
          Math.abs(
            pair.signedAmount,
          ),
        );

        if (
          amount <= CENT_TOLERANCE
        ) {
          return null;
        }

        const forward =
          pair.signedAmount > 0;
        const fromUserId = forward
          ? pair.firstUserId
          : pair.secondUserId;
        const toUserId = forward
          ? pair.secondUserId
          : pair.firstUserId;

        return {
          fromUserId,
          fromName:
            names.get(fromUserId) ??
            "Traveler",
          toUserId,
          toName:
            names.get(toUserId) ??
            "Traveler",
          amount,
        };
      },
    )
    .filter(
      (
        transfer,
      ): transfer is SettlementTransfer =>
        transfer !== null,
    )
    .sort((left, right) => {
      if (
        left.fromName !==
        right.fromName
      ) {
        return left.fromName.localeCompare(
          right.fromName,
        );
      }

      return left.toName.localeCompare(
        right.toName,
      );
    });
}
