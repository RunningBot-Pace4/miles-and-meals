"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { enqueueOfflineMutation, flushOfflineQueue, readOfflineQueue } from "@/lib/offline-queue";
import {
  readOfflinePack,
  writeOfflinePack,
  type OfflineTripPack,
} from "@/lib/offline-pack";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function OfflinePackWorkspace() {
  const [pack, setPack] = useState<OfflineTripPack | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(localDate());
  const [category, setCategory] = useState("Food");

  useEffect(() => {
    const refresh = () => {
      setPack(readOfflinePack());
      setQueueCount(readOfflineQueue().length);
    };
    refresh();
    window.addEventListener("mnm:offline-pack-updated", refresh);
    window.addEventListener("mnm:offline-queue-changed", refresh);
    return () => {
      window.removeEventListener("mnm:offline-pack-updated", refresh);
      window.removeEventListener("mnm:offline-queue-changed", refresh);
    };
  }, []);

  const upcoming = useMemo(
    () => pack?.plan.filter((item) => !item.date || item.date >= localDate()).slice(0, 12) ?? [],
    [pack],
  );

  async function refreshPack() {
    if (!navigator.onLine) {
      setMessage("Still offline. The last saved trip pack remains available.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/offline-pack", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { pack?: OfflineTripPack | null; error?: string };
      if (!response.ok || !payload.pack) throw new Error(payload.error ?? "No active trip is available to save offline.");
      writeOfflinePack(payload.pack);
      setPack(payload.pack);
      setMessage("Offline trip pack updated on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refresh the offline trip pack.");
    } finally {
      setBusy(false);
    }
  }


  async function syncPending() {
    if (!navigator.onLine) {
      setMessage("Still offline. Pending changes remain safely stored on this device.");
      return;
    }

    setSyncing(true);
    setMessage("");
    try {
      const result = await flushOfflineQueue();
      setQueueCount(result.remaining);
      if (result.synced > 0) {
        setMessage(`${result.synced} offline change${result.synced === 1 ? "" : "s"} synced successfully.`);
        window.dispatchEvent(new CustomEvent("mnm:data-synced"));
      } else if (result.blocked > 0) {
        setMessage(`${result.blocked} offline change${result.blocked === 1 ? "" : "s"} needs review. Open the sync badge to retry or discard it.`);
      } else if (result.remaining > 0) {
        setMessage("Pending changes are waiting for their next automatic retry. You can try again shortly.");
      } else {
        setMessage("Everything on this device is already synced.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sync offline changes right now.");
    } finally {
      setSyncing(false);
    }
  }

  function queueQuickExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pack) return;
    const numericAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("Enter a description and a valid amount.");
      return;
    }
    const memberIds = pack.members.map((member) => member.id);
    if (!memberIds.length) {
      setMessage("The saved trip pack has no travelers. Refresh it when online.");
      return;
    }

    const rate = pack.trip.currencyCode === pack.trip.baseCurrency
      ? 1
      : pack.trip.defaultExchangeRate || 1;

    enqueueOfflineMutation({
      url: "/api/expenses",
      method: "POST",
      label: `Quick expense · ${description.trim()}`,
      body: {
        clientRequestId: crypto.randomUUID(),
        countryId: pack.trip.countryId,
        expenseDate,
        category,
        description: description.trim(),
        transactionCurrency: pack.trip.currencyCode,
        transactionAmount: numericAmount,
        exchangeRate: rate,
        rateType: "DEFAULT",
        actualConvertedAmount: "",
        paidByUserId: pack.currentUserId,
        paymentMethod: "",
        receiptUrl: "",
        notes: "Saved from Offline Pack",
        allowDuplicate: true,
        itemization: [],
        splitMode: "EQUAL",
        splits: memberIds.map((userId) => ({ userId, value: 0 })),
      },
    });

    setDescription("");
    setAmount("");
    setQueueCount(readOfflineQueue().length);
    setMessage("Expense saved on this device. It will sync automatically when a connection is available.");
  }

  return (
    <div className="stack gap-lg offline-pack-workspace">
      <section className="panel offline-pack-hero">
        <div>
          <p className="eyebrow">OFFLINE 2.0</p>
          <h2>{pack ? pack.trip.name : "Save your active trip for offline use"}</h2>
          <p className="muted">
            Plans and booking essentials are stored only in this browser on this device. Financial balances and live locations stay server-only.
          </p>
        </div>
        <div className="offline-pack-actions">
          <button className="button secondary" type="button" disabled={busy || syncing} onClick={() => void refreshPack()}>
            {busy ? "Refreshing…" : pack ? "Refresh offline pack" : "Save active trip"}
          </button>
          {queueCount > 0 ? (
            <button className="button primary" type="button" disabled={busy || syncing} onClick={() => void syncPending()}>
              {syncing ? "Syncing…" : `Sync ${queueCount} pending`}
            </button>
          ) : null}
        </div>
        {pack ? (
          <div className="offline-pack-meta">
            <span>{pack.trip.destination}</span>
            <span>Saved {new Date(pack.savedAt).toLocaleString()}</span>
            <span>{queueCount} waiting to sync</span>
          </div>
        ) : null}
      </section>

      {message ? <p className="form-success" role="status">{message}</p> : null}

      {pack ? (
        <>
          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">QUICK EXPENSE</p><h2>Works without internet</h2></div></div>
            <form className="stack gap-md offline-quick-expense" onSubmit={queueQuickExpense}>
              <label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Dinner, taxi, tickets…" maxLength={250} /></label>
              <div className="two-col">
                <label>Amount<span className="input-with-prefix"><b>{pack.trip.currencyCode}</b><input inputMode="decimal" data-numeric-input="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></span></label>
                <label>Date<input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} /></label>
              </div>
              <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Food</option><option>Transport</option><option>Accommodation</option><option>Shopping</option><option>Activities</option><option>Other</option></select></label>
              <p className="muted">Paid by you · split equally between {pack.members.length} traveler{pack.members.length === 1 ? "" : "s"}. You can edit it after sync.</p>
              <button className="button primary" type="submit">Save offline expense</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">SAVED PLAN</p><h2>Travel essentials</h2></div><span>{upcoming.length}</span></div>
            <div className="offline-plan-list">
              {upcoming.length ? upcoming.map((item) => (
                <article key={item.id} className="offline-plan-row">
                  <span><strong>{item.title}</strong><small>{item.date ?? "Any day"}{item.time ? ` · ${item.time}` : ""}{item.area ? ` · ${item.area}` : ""}</small></span>
                  <small>{item.type}</small>
                </article>
              )) : <p className="muted">No saved plan items.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">RESERVATIONS</p><h2>Booking essentials</h2></div><span>{pack.reservations.length}</span></div>
            <div className="offline-plan-list">
              {pack.reservations.length ? pack.reservations.map((item) => (
                <article key={item.id} className="offline-plan-row">
                  <span><strong>{item.title}</strong><small>{item.date ?? "Date not detected"}{item.time ? ` · ${item.time}` : ""}</small><small>{item.provider}{item.confirmationNo ? ` · Ref ${item.confirmationNo}` : ""}</small></span>
                  <small>{item.kind}</small>
                </article>
              )) : <p className="muted">No saved reservations.</p>}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
