"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { extractPdfTextBestEffort, parseBookingText, type BookingImport } from "@/lib/booking-parser";
import { SavingOverlay } from "@/components/SavingOverlay";

type CountryOption = { id: string; tripId: string; tripName: string; name: string; currencyCode: string };
type InboxItem = {
  id: string; countryId: string; sourceType: string; sourceName: string | null; kind: string; title: string;
  provider: string | null; confirmationNo: string | null; bookingDate: string | null; bookingTime: string | null;
  status: string; linkedTravelItemId: string | null; createdAt: Date | string;
};

export function TripInboxClient({ countries, initialItems }: { countries: CountryOption[]; initialItems: InboxItem[] }) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<BookingImport | null>(null);
  const [sourceType, setSourceType] = useState<"PASTE" | "IMAGE" | "PDF" | "TEXT" | "EMAIL">("PASTE");
  const [sourceName, setSourceName] = useState("");
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const countryById = useMemo(() => new Map(countries.map((country) => [country.id, country])), [countries]);

  function analyze(value = text) {
    if (!value.trim()) { setError("Paste or upload a booking first."); return; }
    setDraft(parseBookingText(value)); setError("");
  }

  async function filePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setStatus("Reading booking…"); setSourceName(file.name);
    try {
      let content = "";
      if (file.type.startsWith("image/")) {
        setSourceType("IMAGE");
        const { recognizeReceiptLocally } = await import("@/lib/receipt-ocr-client");
        const result = await recognizeReceiptLocally(file, countryById.get(countryId)?.currencyCode ?? "MYR", ({ status: next }) => setStatus(next));
        content = result.rawText;
      } else {
        const lower = file.name.toLowerCase();
        const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
        setSourceType(isPdf ? "PDF" : lower.endsWith(".eml") ? "EMAIL" : "TEXT");
        if (isPdf) {
          content = extractPdfTextBestEffort(new Uint8Array(await file.arrayBuffer()));
          if (!content.trim()) {
            throw new Error(
              "This PDF does not expose readable text in the browser. Upload a screenshot/photo of the booking instead.",
            );
          }
        } else {
          content = await file.text();
        }
      }
      setText(content.slice(0, 30_000));
      setDraft(parseBookingText(content));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read this booking file.");
    } finally { setBusy(false); setStatus(""); event.target.value = ""; }
  }

  async function save() {
    if (!draft || !countryId) return;
    setBusy(true); setError(""); setStatus("Saving to Trip Inbox…");
    try {
      const response = await fetch("/api/trip-inbox", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ countryId, sourceType, sourceName, kind: draft.kind, title: draft.title, provider: draft.provider, confirmationNo: draft.confirmationNo, bookingDate: draft.bookingDate, bookingTime: draft.bookingTime }) });
      const payload = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "Unable to save Trip Inbox item.");
      setItems((current) => [{ id: payload.id!, countryId, sourceType, sourceName, kind: draft.kind, title: draft.title, provider: draft.provider, confirmationNo: draft.confirmationNo, bookingDate: draft.bookingDate || null, bookingTime: draft.bookingTime || null, status: "INBOX", linkedTravelItemId: null, createdAt: new Date().toISOString() }, ...current]);
      setDraft(null); setText(""); setSourceName("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save Trip Inbox item."); }
    finally { setBusy(false); setStatus(""); }
  }

  async function addToPlan(id: string) {
    setBusy(true); setError(""); setStatus("Adding reservation to Plan…");
    try {
      const response = await fetch(`/api/trip-inbox/${id}/add-to-plan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; travelItemId?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to add to Plan.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, status: "ADDED", linkedTravelItemId: payload.travelItemId ?? item.linkedTravelItemId } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add to Plan."); }
    finally { setBusy(false); setStatus(""); }
  }

  return (
    <div className="stack gap-lg trip-inbox-workspace">
      {busy ? <SavingOverlay title={status || "Working"} message="Keeping your travel reservation organized." /> : null}
      <section className="panel trip-inbox-import">
        <div><p className="eyebrow">TRIP INBOX</p><h2>Import a reservation</h2><p className="muted">Paste an email, upload a screenshot, TXT/EML or PDF. Miles & Meals extracts the useful booking details for review before anything is saved.</p></div>
        <aside className="trip-inbox-scope-note" role="note">
          <strong>Use the full confirmation, not only the number</strong>
          <p>
            Trip Inbox reads details already shown in your booking email, PDF or screenshot.
            It cannot open a private airline or hotel record from a flight number or booking
            reference alone.
          </p>
        </aside>
        <label>Trip<select value={countryId} onChange={(event) => setCountryId(event.target.value)}>{countries.map((country) => <option key={country.id} value={country.id}>{country.tripName}</option>)}</select></label>
        <label className="booking-upload-button">Upload booking<input type="file" accept="image/*,.pdf,.txt,.eml,text/plain,message/rfc822,application/pdf" onChange={(event) => void filePicked(event)} /></label>
        <label>Or paste the full booking/email text<textarea rows={7} value={text} onChange={(event) => { setText(event.target.value); setSourceType("PASTE"); }} placeholder="Paste the complete flight, hotel, train or ticket confirmation here…" /></label>
        <button className="button secondary" type="button" onClick={() => analyze()}>Read booking</button>
      </section>

      {draft ? <section className="panel trip-inbox-review"><p className="eyebrow">REVIEW BEFORE SAVE</p><div className="two-col"><label>Type<select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as BookingImport["kind"] })}><option>FLIGHT</option><option>HOTEL</option><option>TRAIN</option><option>TICKET</option><option>BOOKING</option></select></label><label>Confirmation<input value={draft.confirmationNo} onChange={(e) => setDraft({ ...draft, confirmationNo: e.target.value })} /></label></div><label>Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>Provider<input value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} /></label><div className="two-col"><label>Date<input type="date" value={draft.bookingDate} onChange={(e) => setDraft({ ...draft, bookingDate: e.target.value })} /></label><label>Time<input value={draft.bookingTime} onChange={(e) => setDraft({ ...draft, bookingTime: e.target.value })} placeholder="07:30" /></label></div><button className="button primary" type="button" onClick={() => void save()}>Save to Trip Inbox</button></section> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <section className="panel"><div className="panel-title"><div><p className="eyebrow">SAVED RESERVATIONS</p><h2>Ready when you travel</h2></div></div><div className="trip-inbox-list">{items.length ? items.map((item) => { const country = countryById.get(item.countryId); return <article className="trip-inbox-card" key={item.id}><div><span className="admin-status-pill active">{item.kind}</span><strong>{item.title}</strong><small>{country?.tripName ?? "Trip"}{item.bookingDate ? ` · ${item.bookingDate}` : ""}{item.bookingTime ? ` · ${item.bookingTime}` : ""}</small><small>{item.provider || "Provider not detected"}{item.confirmationNo ? ` · Ref ${item.confirmationNo}` : ""}</small></div>{item.status === "ADDED" ? <span className="success-text">✓ In Plan</span> : <button className="button secondary" type="button" onClick={() => void addToPlan(item.id)}>Add to Plan</button>}</article>; }) : <p className="muted">No saved reservations yet.</p>}</div></section>
    </div>
  );
}
