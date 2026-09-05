"use client";

import { useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

export function DeleteExpenseButton({
  id,
  quiet = false,
}: {
  id: string;
  quiet?: boolean;
}) {
  const [busy, setBusy] =
    useState(false);

  async function remove() {
    if (
      !window.confirm(
        "Delete this expense?",
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `/api/expenses/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      window.dispatchEvent(
        new CustomEvent(
          "mnm:expense-updated",
        ),
      );
      setBusy(false);
    } catch {
      window.alert(
        "Unable to delete expense.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      {busy && !quiet ? (
        <SavingOverlay
          title="Removing expense"
          message="Updating trip totals and traveler balances."
        />
      ) : null}

      <button
        className="text-danger"
        disabled={busy}
        onClick={remove}
        type="button"
      >
        {busy
          ? "Removing…"
          : "Delete"}
      </button>
    </>
  );
}
