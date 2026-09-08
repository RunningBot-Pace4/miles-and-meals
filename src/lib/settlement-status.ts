export type SettlementStatus =
  | "SENT"
  | "SETTLED"
  | "CANCELLED"
  | "REVERSED";

export type ReversibleSettlement = {
  status: SettlementStatus;
  fromUserId: string;
  toUserId: string;
};

export function isActiveSettlementStatus(
  status: string,
): status is "SENT" | "SETTLED" {
  return status === "SENT" || status === "SETTLED";
}

export function isTerminalReversalStatus(
  status: string,
): status is "CANCELLED" | "REVERSED" {
  return status === "CANCELLED" || status === "REVERSED";
}

export function getReversalStatus(
  status: string,
): "CANCELLED" | "REVERSED" | null {
  if (status === "SENT") {
    return "CANCELLED";
  }

  if (status === "SETTLED") {
    return "REVERSED";
  }

  return null;
}

export function canReverseSettlement(
  settlement: ReversibleSettlement,
  currentUserId: string,
  isTripManager: boolean,
): boolean {
  if (isTripManager) {
    return (
      settlement.status === "SENT" ||
      settlement.status === "SETTLED"
    );
  }

  if (settlement.status === "SENT") {
    return settlement.fromUserId === currentUserId;
  }

  if (settlement.status === "SETTLED") {
    return settlement.toUserId === currentUserId;
  }

  return false;
}
