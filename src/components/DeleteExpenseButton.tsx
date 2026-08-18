"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

export function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this expense?")) {
      return;
    }

    setBusy(true);
    const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });

    if (!response.ok) {
      window.alert("Unable to delete expense.");
      setBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <>
      {busy ? (
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
        Delete
      </button>
    </>
  );
}
