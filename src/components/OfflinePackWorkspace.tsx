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

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
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
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);

  const openTrips = useMemo(
    () => trips.filter((trip) => trip.financialStatus !== "CLOSED"),
    [trips],
  );

  useEffect(() => {
    const refresh = () => {
      const storedPacks = readOfflinePacks();
      const remembered = readOfflineSelectedTripId();
      setPacks(storedPacks);
      setQueueCount(readOfflineQueue().length);
      setSelectedTripId((current) => {
        const candidates = new Set([...openTrips.map((trip) => trip.id), ...storedPacks.map((pack) => pack.trip.id)]);
        if (remembered && candidates.has(remembered)) return remembered;
        if (current && candidates.has(current)) return current;
        if (activeTripId && candidates.has(activeTripId)) return activeTripId;
        return storedPacks[0]?.trip.id ?? openTrips[0]?.id ?? "";
      });
    };

    refresh();
    window.addEventListener("mnm:offline-pack-updated", refresh);
    window.addEventListener("mnm:offline-queue-changed", refresh);
    return () => {
      window.removeEventListener("mnm:offline-pack-updated", refresh);
      window.removeEventListener("mnm:offline-queue-changed", refresh);
    };
  }, [activeTripId, openTrips]);

  const pack = useMemo(
    () => packs.find((item) => item.trip.id === selectedTripId) ?? null,
    [packs, selectedTripId],
  );

  const tripOptions = useMemo(() => {
    const options = new Map<string, OfflineTripOption>();
    for (const trip of openTrips) options.set(trip.id, trip);
    for (const saved of packs) {
      if (saved.trip.financialStatus !== "CLOSED" && !options.has(saved.trip.id)) {
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
  }, [openTrips, packs]);

  const packMemberIds = useMemo(
    () => pack?.members.map((member) => member.id) ?? [],
    [pack],
  );

  const memberSignature = packMemberIds.join("|");

  useEffect(() => {
    setSplitMemberIds(packMemberIds);
  }, [pack?.trip.id, memberSignature]);

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

  function chooseEveryone() {
    setSplitMemberIds(packMemberIds);
  }

  function chooseOnlyMe() {
    const currentUserId = pack?.currentUserId;
    const fallbackId = packMemberIds[0];
    setSplitMemberIds(currentUserId && packMemberIds.includes(currentUserId)
      ? [currentUserId]
      : fallbackId
        ? [fallbackId]
        : []);
  }

  function toggleSplitMember(memberId: string) {
    setSplitMemberIds((current) => current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
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
      const result = await flushOfflineQueue({ forceRetry: true });
      setQueueCount(result.remaining);
      if (result.synced > 0) {
        setMessage(`${result.synced} offline change${result.synced === 1 ? "" : "s"} synced to its original Trip.`);
        window.dispatchEvent(new CustomEvent("mnm:data-synced"));
      } else if (result.blocked > 0) {
        setMessage(`${result.blocked} offline change${result.blocked === 1 ? "" : "s"} cannot sync automatically. Open the sync badge to review and discard it if it is no longer valid.`);
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
    const memberIds = splitMemberIds.filter((memberId) => packMemberIds.includes(memberId));
    if (!memberIds.length) {
      setMessage("Choose at least one traveler to share this expense.");
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
        meta: {
          tripId: pack.trip.id,
          tripName: pack.trip.name,
          currency: selectedCurrency,
          sharing: `${memberIds.length} traveler${memberIds.length === 1 ? "" : "s"}`,
          description: description.trim(),
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
          <p className="eyebrow">OFFLINE 3.2 · OPEN TRIPS</p>
          <h2>{pack ? pack.trip.name : "No open Trip is saved offline"}</h2>
          <p className="muted">Each saved pack keeps its own Trip ID, destination currency and base currency, so queued expenses return to the correct ledger after reconnection. Closed Trips are removed from this device list.</p>
        </div>

        <label className="offline-trip-picker">
          Trip
          <select value={selectedTripId} disabled={!tripOptions.length} onChange={(event) => chooseTrip(event.target.value)}>
            {!tripOptions.length ? <option value="">No open Trips available</option> : null}
            {tripOptions.map((trip) => (
              <option key={trip.id} value={trip.id} title={`${trip.name} · ${trip.destination}`}>
                {compactOptionText(`${trip.name} · ${trip.destination}`, 36)}
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
                <fieldset className="offline-share-picker">
                  <legend>Share cost with</legend>
                  <div className="offline-share-shortcuts" aria-label="Offline expense sharing shortcuts">
                    <button className={splitMemberIds.length === packMemberIds.length ? "selected" : ""} type="button" onClick={chooseEveryone}>Everyone</button>
                    <button className={splitMemberIds.length === 1 && splitMemberIds[0] === pack.currentUserId ? "selected" : ""} type="button" onClick={chooseOnlyMe}>Only me</button>
                  </div>
                  <div className="offline-share-members">
                    {pack.members.map((member) => (
                      <label key={member.id}>
                        <input type="checkbox" checked={splitMemberIds.includes(member.id)} onChange={() => toggleSplitMember(member.id)} />
                        <span>{member.name}{member.id === pack.currentUserId ? " · You" : ""}</span>
                      </label>
                    ))}
                  </div>
                  <small>All Trip members can see the expense after sync. The cost is split equally only between the {splitMemberIds.length} selected traveler{splitMemberIds.length === 1 ? "" : "s"}.</small>
                </fieldset>
                <p className="muted">Saving to <strong>{pack.trip.name} · {pack.trip.destination}</strong>. Paid by you. Reconnection syncs this silently to the original Trip.</p>
                <button className="button primary" type="submit">Save offline expense</button>
              </form>
          </section>

          <section className="panel offline-finance-panel">
            <div className="panel-title"><div><p className="eyebrow">FINANCE SNAPSHOT</p><h2>Saved totals</h2></div><small>{pack.finance.baseCurrency}</small></div>
            <div className="offline-stat-grid">
              <article><small>My budget</small><strong>{money(pack.finance.myBudget, pack.finance.baseCurrency)}</strong></article>
              <article><small>My share spent</small><strong>{money(pack.finance.myShareSpent, pack.finance.baseCurrency)}</strong></article>
              <article><small>Group spent</small><strong>{money(pack.finance.groupSpent, pack.finance.baseCurrency)}</strong></article>
              <article><small>My budget left</small><strong>{money(Math.max(0, pack.finance.myBudget - pack.finance.myShareSpent), pack.finance.baseCurrency)}</strong></article>
            </div>
            <small className="muted">Snapshot saved {new Date(pack.savedAt).toLocaleString()}. Reconnect for live totals.</small>
          </section>

          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">RECENT EXPENSES</p><h2>Saved ledger</h2></div><span>{pack.expenses.length}</span></div>
            <div className="offline-expense-list">
              {pack.expenses.length ? pack.expenses.slice(0, 30).map((expense) => <article key={expense.id} className="offline-expense-row"><span><strong>{expense.description}</strong><small>{expense.date} · {expense.category} · my share {money(expense.myShare, pack.finance.baseCurrency)}</small></span><b>{money(expense.amount, expense.currency)}</b></article>) : <p className="muted">No saved expenses.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">SAVED PLAN</p><h2>Travel essentials</h2></div><span>{upcoming.length}</span></div>
            <div className="offline-plan-list">
              {upcoming.length ? upcoming.map((item) => (
                <article key={item.id} className="offline-plan-row"><span><strong>{item.title}</strong><small>{item.date ?? "Any day"}{item.time ? ` · ${item.time}` : ""}{item.area ? ` · ${item.area}` : ""}</small></span><small>{item.type}</small></article>
              )) : <p className="muted">No saved plan items.</p>}
            </div>
          </section>

          <section className="panel offline-safety-panel">
            <div className="panel-title"><div><p className="eyebrow">SAFETY & DOCUMENTS</p><h2>Available on this device</h2></div></div>
            <div className="offline-safety-grid">
              <div><h3>Emergency contacts</h3>{pack.emergencyContacts.length ? pack.emergencyContacts.map((contact) => <article className="offline-contact-row" key={contact.id}><span><strong>{contact.label}</strong><small>{contact.contactName}{contact.notes ? ` · ${contact.notes}` : ""}</small></span><a href={`tel:${contact.phone}`}>{contact.phone}</a></article>) : <p className="muted">No emergency contacts saved.</p>}</div>
              <div><h3>Travel documents</h3>{pack.documents.length ? pack.documents.map((document) => <article className="offline-document-row" key={document.id}><span><strong>{document.title}</strong><small>{document.documentType}{document.expiryDate ? ` · expires ${document.expiryDate}` : ""}{document.visibility === "PRIVATE" ? " · Private" : ""}</small></span>{document.documentData || document.externalUrl ? <a href={document.documentData || document.externalUrl} target="_blank" rel="noreferrer">Open</a> : <small>Reconnect to open</small>}</article>) : <p className="muted">No accessible documents saved.</p>}</div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title"><div><p className="eyebrow">TRIP MEMORIES</p><h2>Saved moments</h2></div><span>{pack.memories.length}</span></div>
            <div className="offline-memory-grid">{pack.memories.length ? pack.memories.slice(0, 12).map((memory) => <article key={memory.id}>{memory.photoData ? <img src={memory.photoData} alt="" /> : null}<span><strong>{memory.title}</strong><small>{memory.occurredOn ?? "Trip moment"}{memory.place ? ` · ${memory.place}` : ""}</small>{memory.story ? <p>{memory.story}</p> : null}</span></article>) : <p className="muted">No saved memories yet.</p>}</div>
          </section>

        </>
      ) : (
        <section className="panel"><h2>No open Trip is available offline</h2><p className="muted">Closed Trips are intentionally hidden. If you have an open Trip, stay online briefly and Miles & Meals will save it automatically on this device.</p></section>
      )}
    </div>
  );
}
