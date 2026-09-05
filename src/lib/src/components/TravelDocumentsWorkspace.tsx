"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { readPrivateTravelFile } from "@/lib/private-travel-file";

type TripOption = { id: string; name: string; financialStatus: string };
type DocumentRow = {
  id: string; title: string; documentType: string; documentData: string | null;
  externalUrl: string | null; expiryDate: string | null; visibility: string;
  createdBy: string; createdByName: string;
};
type ContactRow = { id: string; label: string; contactName: string; phone: string; notes: string | null };

export function TravelDocumentsWorkspace({ trips, initialTripId }: { trips: TripOption[]; initialTripId: string }) {
  const [tripId, setTripId] = useState(initialTripId || trips[0]?.id || "");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("TICKET");
  const [documentData, setDocumentData] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [visibility, setVisibility] = useState("TRIP");
  const [contact, setContact] = useState({ label: "Emergency", contactName: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const trip = useMemo(() => trips.find((item) => item.id === tripId), [tripId, trips]);
  const locked = trip?.financialStatus === "CLOSED";

  async function refresh(targetTripId = tripId) {
    if (!targetTripId) return;
    const [documentsResponse, contactsResponse] = await Promise.all([
      fetch(`/api/trip-documents?tripId=${encodeURIComponent(targetTripId)}`, { cache: "no-store" }),
      fetch(`/api/emergency-contacts?tripId=${encodeURIComponent(targetTripId)}`, { cache: "no-store" }),
    ]);
    const documentPayload = await documentsResponse.json().catch(() => ({})) as { documents?: DocumentRow[]; currentUserId?: string; canManage?: boolean; error?: string };
    const contactPayload = await contactsResponse.json().catch(() => ({})) as { contacts?: ContactRow[]; error?: string };
    if (!documentsResponse.ok || !contactsResponse.ok) throw new Error(documentPayload.error ?? contactPayload.error ?? "Unable to load Trip essentials.");
    setDocuments(documentPayload.documents ?? []);
    setContacts(contactPayload.contacts ?? []);
    setCurrentUserId(documentPayload.currentUserId ?? "");
    setCanManage(Boolean(documentPayload.canManage));
  }

  useEffect(() => { void refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load Trip essentials.")); }, [tripId]);

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setDocumentData(await readPrivateTravelFile(file)); setMessage(`${file.name} is ready to save.`); }
    catch (error) { setDocumentData(""); setMessage(error instanceof Error ? error.message : "Unable to use this file."); }
  }

  async function addDocument(event: FormEvent) {
    event.preventDefault();
    if (busy || locked) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/trip-documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tripId, title, documentType, documentData, externalUrl, expiryDate, visibility }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to add document.");
      setTitle(""); setDocumentData(""); setExternalUrl(""); setExpiryDate("");
      await refresh(); setMessage("Travel document saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add document."); }
    finally { setBusy(false); }
  }

  async function addContact(event: FormEvent) {
    event.preventDefault();
    if (busy || locked) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/emergency-contacts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tripId, ...contact }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to add contact.");
      setContact({ label: "Emergency", contactName: "", phone: "", notes: "" });
      await refresh(); setMessage("Emergency contact saved for this Trip.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add contact."); }
    finally { setBusy(false); }
  }

  async function remove(kind: "document" | "contact", id: string) {
    if (!confirm(`Remove this ${kind}?`) || locked) return;
    const response = await fetch(kind === "document" ? "/api/trip-documents" : "/api/emergency-contacts", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, tripId }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(payload.error ?? `Unable to remove ${kind}.`); return; }
    await refresh();
  }

  return <div className="stack gap-lg travel-documents-workspace">
    <section className="panel"><p className="eyebrow">PRIVATE TRAVEL VAULT</p><h1>Documents &amp; safety</h1><p className="muted">Store only what you need. Private items are visible only to you; shared items follow the Trip permission set.</p><label>Trip<select value={tripId} onChange={(event) => setTripId(event.target.value)}>{trips.map((item) => <option key={item.id} value={item.id}>{item.name}{item.financialStatus === "CLOSED" ? " · Closed" : ""}</option>)}</select></label></section>
    <section className="panel">
      <div className="panel-title"><div><p className="eyebrow">TICKETS · INSURANCE · VISA</p><h2>Travel documents</h2></div><span>{documents.length}</span></div>
      {!locked ? <form className="document-add-form" onSubmit={addDocument}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Flight ticket, hotel voucher…" /></label>
        <label>Type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="TICKET">Ticket</option><option value="HOTEL">Hotel</option><option value="INSURANCE">Insurance</option><option value="PASSPORT">Passport</option><option value="VISA">Visa</option><option value="MEDICAL">Medical</option><option value="OTHER">Other</option></select></label>
        <label>Expiry date<input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></label>
        <label>Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="TRIP">Shared with permitted travelers</option><option value="PRIVATE">Private · only me</option></select></label>
        <label className="span-2">Secure link<input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" /></label>
        <label className="span-2">Or upload JPEG, PNG, WebP or PDF under 850 KB<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => void loadFile(event)} /></label>
        <button className="button primary span-2" type="submit" disabled={busy || !title.trim() || (!documentData && !externalUrl.trim())}>{busy ? "Saving…" : "Save document"}</button>
      </form> : <p className="muted">This Trip is closed; documents are view-only.</p>}
      <div className="document-list">{documents.map((item) => <article key={item.id} className="document-row"><span><strong>{item.title}</strong><small>{item.documentType} · {item.visibility === "PRIVATE" ? "Only me" : `Shared by ${item.createdByName}`}{item.expiryDate ? ` · expires ${item.expiryDate}` : ""}</small></span><div>{item.documentData ? <a href={item.documentData} target="_blank" rel="noreferrer">Open file</a> : null}{item.externalUrl ? <a href={item.externalUrl} target="_blank" rel="noreferrer">Open link</a> : null}{!locked && (canManage || item.createdBy === currentUserId) ? <button type="button" onClick={() => void remove("document", item.id)}>Remove</button> : null}</div></article>)}{!documents.length ? <p className="muted">No documents saved for this Trip.</p> : null}</div>
    </section>
    <section className="panel">
      <div className="panel-title"><div><p className="eyebrow">AVAILABLE OFFLINE</p><h2>Emergency contacts</h2></div><span>{contacts.length}</span></div>
      {!locked ? <form className="emergency-contact-form" onSubmit={addContact}><label>Label<input value={contact.label} onChange={(event) => setContact({ ...contact, label: event.target.value })} /></label><label>Name<input value={contact.contactName} onChange={(event) => setContact({ ...contact, contactName: event.target.value })} /></label><label>Phone<input type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></label><label>Notes<input value={contact.notes} onChange={(event) => setContact({ ...contact, notes: event.target.value })} /></label><button className="button secondary" type="submit" disabled={busy || !contact.contactName.trim() || !contact.phone.trim()}>Add contact</button></form> : null}
      <div className="emergency-contact-list">{contacts.map((item) => <article key={item.id}><span><strong>{item.label} · {item.contactName}</strong><small>{item.notes}</small></span><div><a href={`tel:${item.phone}`}>{item.phone}</a>{!locked ? <button type="button" onClick={() => void remove("contact", item.id)}>Remove</button> : null}</div></article>)}{!contacts.length ? <p className="muted">Add insurance assistance, embassy, hotel or family contact details.</p> : null}</div>
    </section>
    {message ? <p className="form-success" role="status">{message}</p> : null}
  </div>;
}
