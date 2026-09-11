"use client";

import { useEffect, useMemo, useState } from "react";
import { SettlementActionButton } from "@/components/SettlementActionButton";
import { formatMoney } from "@/lib/money";
import type { SmartSettlementExpenseLine } from "@/lib/settlement-ledger";

type BillSettlementAllocatorProps = {
  countryId: string;
  currentUserId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  currency: string;
  directRemaining: number;
  hasPendingPayment: boolean;
  expenses: SmartSettlementExpenseLine[];
};

function amountText(value: number): string {
  return value.toFixed(2);
}

export function BillSettlementAllocator({
  countryId,
  currentUserId,
  fromUserId,
  fromName,
  toUserId,
  toName,
  currency,
  directRemaining,
  hasPendingPayment,
  expenses,
}: BillSettlementAllocatorProps) {
  const [selectedAmounts, setSelectedAmounts] = useState<
    Record<string, string>
  >({});

  const [saved, setSaved] = useState(false);
  const [savedSummary, setSavedSummary] = useState("");

  const isPayer = currentUserId === fromUserId;
  const isReceiver = currentUserId === toUserId;
  const outstandingBills = useMemo(
    () =>
      expenses.filter(
        (expense) => expense.remainingAmount > 0.009,
      ),
    [expenses],
  );

  useEffect(() => {
    setSelectedAmounts((current) => {
      const next: Record<string, string> = {};

      for (const expense of outstandingBills) {
        const existing = current[expense.expenseId];

        if (existing === undefined) {
          continue;
        }

        const numeric = Number(existing);
        next[expense.expenseId] =
          Number.isFinite(numeric) && numeric > expense.remainingAmount
            ? amountText(expense.remainingAmount)
            : existing;
      }

      return next;
    });
  }, [outstandingBills]);

  if (!isPayer && !isReceiver) {
    return null;
  }

  const allocations = outstandingBills
    .map((expense) => ({
      expense,
      amount: Number(selectedAmounts[expense.expenseId] ?? 0),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.amount) &&
        entry.amount > 0,
    );

  const selectedTotal =
    Math.round(
      allocations.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      ) * 100,
    ) / 100;
  const invalidBill = allocations.find(
    ({ expense, amount }) =>
      amount > expense.remainingAmount + 0.009,
  );
  const exceedsDirectBalance =
    selectedTotal > directRemaining + 0.009;

  function toggleBill(
    expense: SmartSettlementExpenseLine,
    selected: boolean,
  ) {
    setSelectedAmounts((current) => {
      const next = { ...current };

      if (selected) {
        next[expense.expenseId] = amountText(
          expense.remainingAmount,
        );
      } else {
        delete next[expense.expenseId];
      }

      return next;
    });
  }

  function updateAmount(
    expenseId: string,
    value: string,
  ) {
    setSelectedAmounts((current) => ({
      ...current,
      [expenseId]: value,
    }));
  }

  if (outstandingBills.length === 0) {
    return (
      <div className="bill-payment-allocator settled">
        <strong>{hasPendingPayment ? "Payment awaiting confirmation" : "All allocated bills are settled"}</strong>
        <small>
          {hasPendingPayment ? "These amounts are reserved until the receiver confirms receipt." : "No bill-specific payment remains for this relationship."}
        </small>
      </div>
    );
  }

  if (hasPendingPayment) {
    return (
      <div className="bill-payment-allocator pending">
        <strong>Payment awaiting confirmation</strong>
        <small>
          Confirm the existing payment first. Its bill allocations are
          preserved and cannot be changed while confirmation is pending.
        </small>
      </div>
    );
  }

  if (directRemaining <= 0.009) {
    return (
      <div className="bill-payment-allocator legacy-covered">
        <strong>No additional direct payment is due</strong>
        <small>
          Some older direct payments may be unassigned to individual bills.
          Miles &amp; Meals keeps those payments separate instead of guessing
          which receipt they covered.
        </small>
      </div>
    );
  }

  return (
    <div className="bill-payment-allocator">
      {saved && (
        <p className="bill-payment-saved" role="status">
          <span aria-hidden="true">✓</span>
          {isPayer
            ? "Payment saved. Waiting for the receiver to confirm."
            : "Payment received and saved."}
          {" "}{savedSummary}
        </p>
      )}
      <div className="bill-payment-allocator-head">
        <span className="bill-payment-allocator-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7 7.5h10M7 12h7M7 16.5h5" />
            <path d="M5 3.5h14a1 1 0 0 1 1 1v15l-3-1.7-2.5 1.7-2.5-1.7-2.5 1.7L7 17.8 4 19.5v-15a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        <div className="bill-payment-allocator-copy">
          <small className="bill-payment-eyebrow">Payment allocation</small>
          <strong>
            {isPayer ? "Send a payment" : "Confirm money received"}
          </strong>
          <small>
            Select the bill this payment covers. You can enter a partial amount.
          </small>
        </div>
        <span className="bill-payment-balance">
          <small>Still due</small>
          <strong>{formatMoney(directRemaining, currency)}</strong>
        </span>
      </div>

      <div className="bill-payment-select-list">
        {outstandingBills.map((expense) => {
          const selected =
            selectedAmounts[expense.expenseId] !== undefined;

          return (
            <label
              className={[
                "bill-payment-select-row",
                selected ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={expense.expenseId}
            >
              <input
                checked={selected}
                onChange={(event) =>
                  toggleBill(expense, event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <strong>{expense.description}</strong>
                <small>
                  Remaining{" "}
                  {formatMoney(
                    expense.remainingAmount,
                    expense.currency,
                  )}{" "}
                  of{" "}
                  {formatMoney(
                    expense.shareAmount,
                    expense.currency,
                  )}
                </small>
              </span>
              <span className="bill-payment-select-state">
                {selected ? "Selected" : "Select bill"}
              </span>
              <span className="bill-payment-amount-input">
                <b>{currency}</b>
                <input
                  aria-label={`${expense.description} payment amount`}
                  data-numeric-input="decimal"
                  disabled={!selected}
                  inputMode="decimal"
                  max={expense.remainingAmount}
                  min="0.01"
                  onChange={(event) =>
                    updateAmount(
                      expense.expenseId,
                      event.target.value,
                    )
                  }
                  step="0.01"
                  type="number"
                  value={
                    selected
                      ? selectedAmounts[expense.expenseId] ?? ""
                      : ""
                  }
                />
              </span>
            </label>
          );
        })}
      </div>

      <div className="bill-payment-allocator-footer">
        <span className="bill-payment-total">
          <small>Payment total</small>
          <strong>{formatMoney(selectedTotal, currency)}</strong>
          <small>
            {allocations.length === 0
              ? "No bill selected"
              : `${allocations.length} ${allocations.length === 1 ? "bill" : "bills"} selected`}
          </small>
        </span>

        {invalidBill ? (
          <small className="bill-payment-error" role="alert">
            {invalidBill.expense.description} cannot exceed{" "}
            {formatMoney(
              invalidBill.expense.remainingAmount,
              currency,
            )}.
          </small>
        ) : exceedsDirectBalance ? (
          <small className="bill-payment-error" role="alert">
            Selected bills exceed the direct amount still owed between{" "}
            {fromName} and {toName}.
          </small>
        ) : null}

        {selectedTotal > 0 &&
        !invalidBill &&
        !exceedsDirectBalance ? (
          <SettlementActionButton
            onRecorded={() => { setSavedSummary(`${formatMoney(selectedTotal, currency)} · ${allocations.map(({ expense, amount }) => `${expense.description}: ${formatMoney(amount, currency)} applied, ${formatMoney(Math.max(0, expense.remainingAmount - amount), currency)} remaining${isPayer ? " after confirmation" : ""}`).join("; ")}`); setSelectedAmounts({}); setSaved(true); }}
            action={isPayer ? "MARK_PAID" : "MARK_RECEIVED"}
            allocations={allocations.map(({ expense, amount }) => ({
              expenseId: expense.expenseId,
              amount,
            }))}
            countryId={countryId}
            counterpartyUserId={isPayer ? toUserId : fromUserId}
            currency={currency}
            fixedAmount
            label={
              isPayer
                ? `Confirm ${formatMoney(selectedTotal, currency)} sent`
                : `Confirm ${formatMoney(selectedTotal, currency)} received`
            }
            maximumAmount={selectedTotal}
          />
        ) : (
          <small className="bill-payment-hint">
            Select a bill above to continue.
          </small>
        )}
      </div>
    </div>
  );
}
