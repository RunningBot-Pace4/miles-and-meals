"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";

const categories = ["Food", "Transport", "Hotel", "Shopping", "Attractions", "Flights", "Other"];

type TripOption = {
  tripId: string;
  tripName: string;
  baseCurrency: string;
  financialStatus: string;
};

type CategoryRow = { category: string; amount: number; spent: number };

export function CategoryBudgetManager({ trips }: { trips: TripOption[] }) {
  const [tripId, setTripId] = useState(trips[0]?.tripId ?? "");
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [canManage, setCanManage] = useState(false);
  const [busyCategory, setBusyCategory] = useState("");
  const [error, setError] = useState("");
  const trip = useMemo(() => trips.find((item) => item.tripId === tripId), [tripId, trips]);

  useEffect(() => {
    if (!tripId) return;
    const controller = new AbortController();
    fetch(`/api/category-budgets?tripId=${encodeURIComponent(tripId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { categories?: CategoryRow[]; canManage?: boolean; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load category limits.");
        const nextRows = payload.categories ?? [];
        setRows(nextRows);
        setValues(Object.fromEntries(nextRows.map((row) => [row.category, String(row.amount)])));
        setCanManage(Boolean(payload.canManage));
        setError("");
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load category limits.");
      });
    return () => controller.abort();
  }, [tripId]);

  async function save(category: string) {
    if (!tripId || !canManage || trip?.financialStatus === "CLOSED") return;
    const amount = Number(values[category] ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid category limit, or 0 to remove it.");
      return;
    }
    setBusyCategory(category);
    setError("");
    try {
      const response = await fetch("/api/category-budgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId, category, amount }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save category limit.");
      setRows((current) => {
        const spent = current.find((row) => row.category === category)?.spent ?? 0;
        return amount === 0
          ? current.filter((row) => row.category !== category)
          : [...current.filter((row) => row.category !== category), { category, amount, spent }];
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save category limit.");
    } finally {
      setBusyCategory("");
    }
  }

  return (
    <section className="category-budget-manager">
      <div className="travel-section-heading">
        <div>
          <p className="eyebrow">GROUP GUARDRAILS</p>
          <h2>Category limits</h2>
          <p className="muted">Compare planned limits with actual group spending.</p>
        </div>
      </div>

      <label className="category-budget-trip-select">
        Trip
        <select value={tripId} onChange={(event) => setTripId(event.target.value)}>
          {trips.map((item) => (
            <option value={item.tripId} key={item.tripId}>{item.tripName}{item.financialStatus === "CLOSED" ? " · Closed" : ""}</option>
          ))}
        </select>
      </label>

      <div className="category-budget-grid">
        {categories.map((category) => {
          const row = rows.find((item) => item.category === category);
          const limit = Number(values[category] ?? row?.amount ?? 0);
          const percent = limit > 0 ? Math.min(100, ((row?.spent ?? 0) / limit) * 100) : 0;
          return (
            <article key={category} className={row && row.spent > row.amount ? "category-budget-row over" : "category-budget-row"}>
              <div>
                <strong>{category}</strong>
                <small>{formatMoney(row?.spent ?? 0, trip?.baseCurrency ?? "MYR")} spent</small>
              </div>
              <div className="category-budget-progress" aria-label={`${percent.toFixed(0)}% used`}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <label>
                Limit
                <span>
                  <b>{trip?.baseCurrency ?? "MYR"}</b>
                  <input
                    inputMode="decimal"
                    data-numeric-input="decimal"
                    value={values[category] ?? ""}
                    disabled={!canManage || trip?.financialStatus === "CLOSED"}
                    placeholder="No limit"
                    onChange={(event) => setValues((current) => ({ ...current, [category]: event.target.value }))}
                  />
                </span>
              </label>
              {canManage && trip?.financialStatus !== "CLOSED" ? (
                <button type="button" disabled={busyCategory === category} onClick={() => void save(category)}>
                  {busyCategory === category ? "Saving…" : "Save"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
      {!canManage ? <p className="muted">Only the Trip Owner can change group limits. Everyone can view progress.</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
