"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { compactOptionText } from "@/lib/display-text";
import { enqueueOfflineMutation, flushOfflineQueue, readOfflineQueue } from "@/lib/offline-queue";
import {
  readOfflinePacks,
  readOfflineSelectedTripId,
  writeOfflinePack,
  writeOfflineSelectedTripId,
  type OfflineTripOption,
  type OfflineTripPack,
} from "@/lib/offline-pack";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function OfflinePackWorkspace({
  trips,
  activeTripId,
}: {
  trips: OfflineTripOption[];
  activeTripId: string;
}) {
  const [packs, setPacks] = useState<OfflineTripPack[]>([]);
  const [selectedTripId, setSelectedTripId] = useState(activeTripId);
  const [queueCount, setQueueCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(localDate());
  const [category, setCategory] = useState("Food");
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    const refresh = () => {
      const storedPacks = readOfflinePacks();
      const remembered = readOfflineSelectedTripId();
      setPacks(storedPacks);
      setQueueCount(readOfflineQueue().length);
      setSelectedTripId((current) => {
        const candidates = new Set([...trips.map((trip) => trip.id), ...storedPacks.map((pack) => pack.trip.id)]);
        if (remembered && candidates.has(remembered)) return remembered;
        if (current && candidates.has(current)) return current;
        if (activeTripId && candidates.has(activeTripId)) return activeTripId;
        return storedPacks[0]?.trip.id ?? trips[0]?.id ?? "";
      });
    };

    refresh();
    window.addEventListener("mnm:offline-pack-updated", refresh);
    window.addEventListener("mnm:offline-queue-changed", refresh);
    return () => {
      window.removeEventListener("mnm:offline-pack-updated", refresh);
      window.removeEventListener("mnm:offline-queue-changed", refresh);
    };
  }, [activeTripId, trips]);

  const pack = useMemo(
    () => packs.find((item) => item.trip.id === selectedTripId) ?? null,
    [packs, selectedTripId],
  );

  const tripOptions = useMemo(() => {
    const options = new Map<string, OfflineTripOption>();
    for (const trip of trips) options.set(trip.id, trip);
    for (const saved of packs) {
      if (!options.has(saved.trip.id)) {
        options.set(saved.trip.id, {
          id: saved.trip.id,
          name: saved.trip.name,
          destination: saved.trip.destination,
          currencyCode: saved.trip.currencyCode,
          baseCurrency: saved.trip.baseCurrency,
          financialStatus: saved.trip.financialStatus,
        });
      }
    }
    return [...options.values()];
  }, [packs, trips]);

  const currencyOptions = useMemo(
    () => pack
      ? [...new Set([pack.trip.currencyCode.toUpperCase(), pack.trip.baseCurrency.toUpperCase()])]
      : [],
    [pack],
  );

  useEffect(() => {
    setCurrency(pack?.trip.currencyCode.toUpperCase() ?? "");
  }, [pack?.trip.id, pack?.trip.currencyCode]);

  const upcoming = useMemo(
    () => pack?.plan.filter((item) => !item.date || item.date >= localDate()).slice(0, 12) ?? [],
    [pack],
  );

  function chooseTrip(tripId: string) {
    setSelectedTripId(tripId);
    writeOfflineSelectedTripId(tripId);
    setMessage(readOfflinePacks().some((item) => item.trip.id === tripId)
      ? "Showing the saved offline pack for this Trip."
      : "This Trip is not saved on this device yet. Save it while online.");
  }

  async function refreshPack() {
    if (!selectedTripId) {
      setMessage("Choose a Trip first.");
      return;
    }
    if (!navigator.onLine) {
      setMessage(pack
        ? "Still offline. This Trip's last saved pack remains available."
        : "This Trip has not been saved on this device. Reconnect, then tap Save offline pack.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/offline-pack?tripId=${encodeURIComponent(selectedTripId)}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { pack?: OfflineTripPack | null; error?: string };
      if (!response.ok || !payload.pack) throw new Error(payload.error ?? "This Trip is not available to save offline.");
      writeOfflinePack(payload.pack);
      setPacks(readOfflinePacks());
      setMessage(`${payload.pack.trip.name} saved for offline use on this device.`);
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
      const result = await flushOfflineQueue({ forceBlocked: true, forceRetry: true });
      setQueueCount(result.remaining);
      if (result.synced > 0) {
        setMessage(`${result.synced} offline change${result.synced === 1 ? "" : "s"} synced to its original Trip.`);
        window.dispatchEvent(new CustomEvent("mnm:data-synced"));
      } else if (result.blocked > 0) {
        setMessage(`${result.blocked} offline change${result.blocked === 1 ? "" : "s"} needs review. Open the sync badge to retry or discard it.`);
      } else if (result.remaining > 0) {
        setMessage("The connection failed again. Your changes remain stored on this device.");
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
    if (pack.trip.financialStatus === "CLOSED") {
      setMessage("This Trip's expense ledger is locked. Reopen it from Settlement before adding spending.");
      return;
    }
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

    const selectedCurrency = currency.toUpperCase();
    const rate = selectedCurrency === pack.trip.baseCurrency.toUpperCase()
      ? 1
      : pack.trip.defaultExchangeRate || 1;

    try {
      enqueueOfflineMutation({
        url: "/api/expenses",
        method: "POST",
        label: `${pack.trip.name} · ${selectedCurrency} · ${description.trim()}`,
        body: {
          clientRequestId: crypto.randomUUID(),
          countryId: pack.trip.countryId,
          expenseDate,
          category,
          description: description.trim(),
          transactionCurrency: selectedCurrency,
          transactionAmount: numericAmount,
          exchangeRate: rate,
          rateType: "DEFAULT",
          actualConvertedAmount: "",
          paidByUserId: pack.currentUserId,
          paymentMethod: "",
          receiptUrl: "",
          notes: `Saved offline for ${pack.trip.name}`,
          allowDuplicate: true,
          itemization: [],
          splitMode: "EQUAL",
          splits: memberIds.map((userId) => ({ userId, value: 0 })),
        },
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "This offline expense could not be saved on this device.");
      return;
    }

    setDescription("");
    setAmount("");
    setQueueCount(readOfflineQueue().length);
    setMessage(`Expense saved for ${pack.trip.name} in ${selectedCurrency}. It will sync automatically when online.`);
  }

  return (
    <div className="stack gap-lg offline-pack-workspace">
      <section className="panel offline-pack-hero">
        <div>
          <p className="eyebrow">OFFLINE 3.0 · MULTI-TRIP</p>
          <h2>{pack ? pack.trip.name : "Choose a Trip to save offline"}</h2>
          <p className="muted">Each saved pack keeps its own Trip ID, destination currency and base currency, so queued expenses return to the correct ledger after reconnection.</p>
        </div>

        <label className="offline-trip-picker">
          Trip
          <select value={selectedTripId} onChange={(event) => chooseTrip(event.target.value)}>
            {tripOptions.map((trip) => (
              <option key={trip.id} value={trip.id} title={`${trip.name} · ${trip.destination}`}>
                {compactOptionText(`${trip.name} · ${trip.destination}`, 44)}
              </option>
            ))}
          </select>
          <small>{packs.length} Trip pack{packs.length === 1 ? "" : "s"} saved on this device.</small>
        </label>

        <div className="offline-pack-actions">
          <button className="button secondary" type="button" disabled={busy || syncing || !selectedTripId} onClick={() => void refreshPack()}>
            {busy ? "Saving…" : pack ? "Refresh selected pack" : "Save selected Trip"}
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
            <span>Trip {pack.trip.currencyCode}</span>
            <span>Base {pack.trip.baseCurrency}</span>
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
            {pack.trip.financialStatus === "CLOSED" ? (
              <p className="form-warning">Expenses are locked for this Trip. Its plan remains available offline, but new spending cannot be queued.</p>
            ) : (
              <form className="stack gap-md offline-quick-expense" onSubmit={queueQuickExpense}>
                <label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Dinner, taxi, tickets…" maxLength={250} /></label>
                <div className="two-col">
                  <label>Amount<span className="input-with-prefix"><b>{currency}</b><input inputMode="decimal" data-numeric-input="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></span></label>
                  <label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencyOptions.map((code) => <option key={code} value={code}>{code}{code === pack.trip.currencyCode.toUpperCase() ? " · destination" : " · base"}</option>)}</select></label>
                </div>
                <div className="two-col">
                  <label>Date<input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} /></label>
                  <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Food</option><option>Transport</option><option>Accommodation</option><option>Shopping</option><option>Activities</option><option>Other</option></select></label>
                </div>
                <p className="muted">Saving to <strong>{pack.trip.name} · {pack.trip.destination}</strong>. Paid by you and split equally between {pack.members.length} traveler{pack.members.length === 1 ? "" : "s"}.</p>
                <button className="button primary" type="submit">Save offline expense</button>
              </form>
            )}
          </section>

          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">SAVED PLAN</p><h2>Travel essentials</h2></div><span>{upcoming.length}</span></div>
            <div className="offline-plan-list">
              {upcoming.length ? upcoming.map((item) => (
                <article key={item.id} className="offline-plan-row"><span><strong>{item.title}</strong><small>{item.date ?? "Any day"}{item.time ? ` · ${item.time}` : ""}{item.area ? ` · ${item.area}` : ""}</small></span><small>{item.type}</small></article>
              )) : <p className="muted">No saved plan items.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">RESERVATIONS</p><h2>Booking essentials</h2></div><span>{pack.reservations.length}</span></div>
            <div className="offline-plan-list">
              {pack.reservations.length ? pack.reservations.map((item) => (
                <article key={item.id} className="offline-plan-row"><span><strong>{item.title}</strong><small>{item.date ?? "Date not detected"}{item.time ? ` · ${item.time}` : ""}</small><small>{item.provider}{item.confirmationNo ? ` · Ref ${item.confirmationNo}` : ""}</small></span><small>{item.kind}</small></article>
              )) : <p className="muted">No saved reservations.</p>}
            </div>
          </section>
        </>
      ) : (
        <section className="panel"><h2>No pack saved for this Trip</h2><p className="muted">While online, choose the Trip above and tap Save selected Trip. Repeat for every Trip you want available without internet.</p></section>
      )}
    </div>
  );
}
