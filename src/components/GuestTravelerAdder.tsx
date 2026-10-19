"use client";
import { useEffect, useRef, useState } from "react";
export function GuestTravelerAdder({ countryId, disabled, onAdded, onBusyChange }: {
  countryId: string; disabled: boolean;
  onAdded: (guest: { id: string; name: string; isGuest: boolean }) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const request = useRef<{ name: string; id: string } | null>(null);
  const busyCallback = useRef(onBusyChange); busyCallback.current = onBusyChange;
  useEffect(() => () => { controller.current?.abort(); busyCallback.current(false); }, []);
  async function addGuest() {
    if (busy || controller.current || disabled || !name.trim()) return;
    if (!navigator.onLine) { setMessage("Connect to the internet to add a new guest."); return; }
    setBusy(true); onBusyChange(true); setMessage("");
    const abort = new AbortController(); controller.current = abort;
    if (!request.current || request.current.name !== name.trim()) request.current = { name: name.trim(), id: crypto.randomUUID() };
    const timer = window.setTimeout(() => abort.abort(), 20000);
    try {
      const response = await fetch(`/api/countries/${encodeURIComponent(countryId)}/guests`, {
        method: "POST", headers: { "content-type": "application/json" }, signal: abort.signal,
        body: JSON.stringify({ name: name.trim(), requestId: request.current.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to add guest.");
      if (!abort.signal.aborted) { onAdded(data.guest); setName(""); request.current = null; setMessage(`${data.guest.name} is selected for this bill.`); }
    } catch (error) { if (controller.current === abort) setMessage(abort.signal.aborted ? "Guest save took too long. Retry to check the same save safely." : error instanceof Error ? error.message : "Unable to add guest."); }
    finally { window.clearTimeout(timer); if (controller.current === abort) { controller.current = null; setBusy(false); onBusyChange(false); } }
  }
  return <section className="guest-traveler-adder" aria-label="Add a guest traveler">
    <div><strong>Someone without the app?</strong><p>Add their name to split this bill. No login or invitation needed.</p></div>
    <div className="guest-traveler-controls"><label>Guest name<input value={name} maxLength={80} disabled={disabled || busy} placeholder="e.g. Alex" autoComplete="off" onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void addGuest(); } }} /></label><button type="button" className="button secondary" disabled={disabled || busy || !name.trim()} onClick={() => void addGuest()}>{busy ? "Adding…" : "+ Add guest"}</button></div>
    {message && <p role="status">{message}</p>}
  </section>;
}
