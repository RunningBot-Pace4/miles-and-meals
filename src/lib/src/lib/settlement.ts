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

/**
 * Keeps the original directed obligations visible, but removes payments that
 * were already sent/confirmed in that same direction. This is intentionally
 * separate from calculateOutstandingSettlements(): the existing settlement
 * flow remains untouched while Smart Settlement gets an explainable source
 * ledger to compare against.
 */
export function calculateDirectOutstandingObligations(
  obligations: SettlementTransfer[],
  recorded: RecordedSettlement[],
): SettlementTransfer[] {
  const names = new Map<string, string>();
  const directed = new Map<string, number>();

  function remember(userId: string, name: string) {
    if (!names.has(userId)) {
      names.set(userId, name);
    }
  }

  function key(fromUserId: string, toUserId: string) {
    return `${fromUserId}\u0000${toUserId}`;
  }

  function add(fromUserId: string, toUserId: string, amount: number) {
    if (fromUserId === toUserId || amount <= CENT_TOLERANCE) {
      return;
    }

    const currentKey = key(fromUserId, toUserId);
    directed.set(currentKey, (directed.get(currentKey) ?? 0) + amount);
  }

  for (const obligation of obligations) {
    remember(obligation.fromUserId, obligation.fromName);
    remember(obligation.toUserId, obligation.toName);
    add(obligation.fromUserId, obligation.toUserId, obligation.amount);
  }

  for (const payment of recorded) {
    const paymentKey = key(payment.fromUserId, payment.toUserId);
    const reverseKey = key(payment.toUserId, payment.fromUserId);
    const current = directed.get(paymentKey) ?? 0;
    const remaining = roundMoney(current - payment.amount);

    if (remaining >= -CENT_TOLERANCE) {
      if (remaining > CENT_TOLERANCE) {
        directed.set(paymentKey, remaining);
      } else {
        directed.delete(paymentKey);
      }
      continue;
    }

    // If an old payment is now larger than the underlying direction (for
    // example after an expense edit), surface the excess as a reverse refund.
    directed.delete(paymentKey);
    directed.set(
      reverseKey,
      roundMoney((directed.get(reverseKey) ?? 0) + Math.abs(remaining)),
    );
  }

  return [...directed.entries()]
    .map(([compoundKey, value]): SettlementTransfer | null => {
      const amount = roundMoney(value);

      if (amount <= CENT_TOLERANCE) {
        return null;
      }

      const [fromUserId, toUserId] = compoundKey.split("\u0000");

      if (!fromUserId || !toUserId) {
        return null;
      }

      return {
        fromUserId,
        fromName: names.get(fromUserId) ?? "Traveler",
        toUserId,
        toName: names.get(toUserId) ?? "Traveler",
        amount,
      };
    })
    .filter((transfer): transfer is SettlementTransfer => transfer !== null)
    .sort((left, right) => {
      if (left.fromName !== right.fromName) {
        return left.fromName.localeCompare(right.fromName);
      }

      return left.toName.localeCompare(right.toName);
    });
}

/**
 * Nets still-outstanding obligations into a minimum-transfer practical plan
 * for normal travel-group sizes. It uses an exact search for up to 11 people
 * with a deterministic fallback for unusually large groups.
 */
export function calculateSmartSettlementPlan(
  obligations: SettlementTransfer[],
): SettlementTransfer[] {
  const people = new Map<
    string,
    { userId: string; name: string; balanceCents: number }
  >();

  function person(userId: string, name: string) {
    const existing = people.get(userId);

    if (existing) {
      return existing;
    }

    const created = {
      userId,
      name,
      balanceCents: 0,
    };
    people.set(userId, created);
    return created;
  }

  for (const obligation of obligations) {
    const cents = Math.round(obligation.amount * 100);

    if (cents <= 0 || obligation.fromUserId === obligation.toUserId) {
      continue;
    }

    person(obligation.fromUserId, obligation.fromName).balanceCents -= cents;
    person(obligation.toUserId, obligation.toName).balanceCents += cents;
  }

  const accounts = [...people.values()].filter(
    (entry) => entry.balanceCents !== 0,
  );

  if (accounts.length === 0) {
    return [];
  }

  // Exact search is intentionally capped. Normal travel groups are usually
  // small enough for this to prove the minimum practical transfer count; a
  // large group falls back to the deterministic O(n) settlement engine so the
  // UI never freezes while calculating a report.
  if (accounts.length > 11) {
    return calculateSettlements(
      accounts.map((entry) => ({
        userId: entry.userId,
        name: entry.name,
        paid: Math.max(0, entry.balanceCents) / 100,
        owed: Math.max(0, -entry.balanceCents) / 100,
      })),
    );
  }

  type PlannedTransfer = {
    fromIndex: number;
    toIndex: number;
    amountCents: number;
  };

  const memo = new Map<string, PlannedTransfer[]>();

  function solve(balances: number[]): PlannedTransfer[] {
    const first = balances.findIndex((value) => value !== 0);

    if (first < 0) {
      return [];
    }

    const memoKey = balances.join(",");
    const cached = memo.get(memoKey);

    if (cached) {
      return cached;
    }

    let best: PlannedTransfer[] | null = null;
    const firstBalance = balances[first];
    const seenCounterBalances = new Set<number>();

    for (let index = first + 1; index < balances.length; index += 1) {
      const counterBalance = balances[index];

      if (
        counterBalance === 0 ||
        Math.sign(counterBalance) === Math.sign(firstBalance) ||
        seenCounterBalances.has(counterBalance)
      ) {
        continue;
      }

      seenCounterBalances.add(counterBalance);
      const amountCents = Math.min(
        Math.abs(firstBalance),
        Math.abs(counterBalance),
      );
      const next = [...balances];
      let transfer: PlannedTransfer;

      if (firstBalance < 0) {
        next[first] += amountCents;
        next[index] -= amountCents;
        transfer = {
          fromIndex: first,
          toIndex: index,
          amountCents,
        };
      } else {
        next[first] -= amountCents;
        next[index] += amountCents;
        transfer = {
          fromIndex: index,
          toIndex: first,
          amountCents,
        };
      }

      const candidate = [transfer, ...solve(next)];

      if (!best || candidate.length < best.length) {
        best = candidate;
      }

      // Exact opposite balances settle two people in one transfer. No other
      // pairing for this first account can do better at this recursion depth.
      if (firstBalance + counterBalance === 0) {
        break;
      }
    }

    const result = best ?? [];
    memo.set(memoKey, result);
    return result;
  }

  return solve(accounts.map((entry) => entry.balanceCents)).map((transfer) => ({
    fromUserId: accounts[transfer.fromIndex].userId,
    fromName: accounts[transfer.fromIndex].name,
    toUserId: accounts[transfer.toIndex].userId,
    toName: accounts[transfer.toIndex].name,
    amount: transfer.amountCents / 100,
  }));
}
