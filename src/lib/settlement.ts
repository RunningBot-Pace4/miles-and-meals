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

export function calculateSettlements(
  input: SettlementInput[],
): SettlementTransfer[] {
  const debtors = input
    .map((person) => ({ ...person, balance: person.paid - person.owed }))
    .filter((person) => person.balance < -0.005)
    .sort((a, b) => a.balance - b.balance);

  const creditors = input
    .map((person) => ({ ...person, balance: person.paid - person.owed }))
    .filter((person) => person.balance > 0.005)
    .sort((a, b) => b.balance - a.balance);

  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(-debtor.balance, creditor.balance);
    const rounded = Math.round(amount * 100) / 100;

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

    if (Math.abs(debtor.balance) < 0.005) {
      debtorIndex += 1;
    }

    if (Math.abs(creditor.balance) < 0.005) {
      creditorIndex += 1;
    }
  }

  return transfers;
}
