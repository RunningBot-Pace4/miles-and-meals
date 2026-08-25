"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  extractPdfTextBestEffort,
  parseBookingText,
  type BookingImport,
} from "@/lib/booking-parser";
import { SavingOverlay } from "@/components/SavingOverlay";
import { compactOptionText } from "@/lib/display-text";
import type { FlightScheduleResult } from "@/lib/flight-schedule";

type CountryOption = {
  id: string;
  tripId: string;
  tripName: string;
  name: string;
  currencyCode: string;
  startDate: string | null;
  financialStatus: string;
};

type InboxItem = {
  id: string;
  countryId: string;
  sourceType: string;
  sourceName: string | null;
  kind: string;
  title: string;
  provider: string | null;
  confirmationNo: string | null;
  bookingDate: string | null;
  bookingTime: string | null;
  status: string;
  linkedTravelItemId: string | null;
  createdAt: Date | string;
};

export function TripInboxClient({
  countries,
  initialItems,
}: {
  countries: CountryOption[];
  initialItems: InboxItem[];
}) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<BookingImport | null>(null);
  const [sourceType, setSourceType] = useState<
    "PASTE" | "IMAGE" | "PDF" | "TEXT" | "EMAIL"
  >("PASTE");
  const [sourceName, setSourceName] = useState("");
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [lookupDate, setLookupDate] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");

  const countryById = useMemo(
    () => new Map(countries.map((country) => [country.id, country])),
    [countries],
  );
  const selectedCountry = countryById.get(countryId);
  const tripClosed = selectedCountry?.financialStatus === "CLOSED";

  function analyze(value = text) {
    if (!value.trim()) {
      setError("Paste, upload, or type a flight number first.");
      return;
    }

    const parsed = parseBookingText(value);
    setDraft(parsed);
    if (parsed.flightNumber) {
      setLookupDate(parsed.bookingDate || selectedCountry?.startDate || "");
    }
    setScheduleMessage("");
    setError("");
  }

  async function lookupFlightSchedule() {
    if (!draft?.flightNumber) return;
    if (!lookupDate) {
      setError("Choose the flight date first. A flight number repeats on different days.");
      return;
    }

    setLookupBusy(true);
    setError("");
    setScheduleMessage("");
    try {
      const response = await fetch(
        `/api/flight-lookup?flightNumber=${encodeURIComponent(draft.flightNumber)}&date=${encodeURIComponent(lookupDate)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        schedule?: FlightScheduleResult;
      };
      if (!response.ok || !payload.schedule) {
        throw new Error(payload.error ?? "Unable to retrieve this flight schedule.");
      }

      const schedule = payload.schedule;
      setDraft({
        ...draft,
        title: `Flight ${schedule.flightNumber}${schedule.route ? ` · ${schedule.route}` : ""}`,
        provider: schedule.airline || draft.provider,
        bookingDate: schedule.flightDate,
        bookingTime: schedule.departureTime,
        route: schedule.route || draft.route,
      });
      setScheduleMessage(
        `Schedule retrieved: departure ${schedule.flightDate} ${schedule.departureTime}${schedule.arrivalTime ? ` · arrival ${schedule.arrivalDate || schedule.flightDate} ${schedule.arrivalTime}` : ""}. Airport-local times.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to retrieve this flight schedule.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function filePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    setStatus("Reading booking…");
    setSourceName(file.name);

    try {
      let content = "";

      if (file.type.startsWith("image/")) {
        setSourceType("IMAGE");
        const { recognizeReceiptLocally } = await import(
          "@/lib/receipt-ocr-client"
        );
        const result = await recognizeReceiptLocally(
          file,
          countryById.get(countryId)?.currencyCode ?? "MYR",
          ({ status: next }) => setStatus(next),
        );
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

      const parsed = parseBookingText(content);
      setText(content.slice(0, 30_000));
      setDraft(parsed);
      if (parsed.flightNumber) {
        setLookupDate(parsed.bookingDate || selectedCountry?.startDate || "");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to read this booking file.",
      );
    } finally {
      setBusy(false);
      setStatus("");
      event.target.value = "";
    }
  }

  async function save() {
    if (!draft || !countryId) return;

    setBusy(true);
    setError("");
    setStatus("Saving to Trip Inbox…");

    try {
      const response = await fetch("/api/trip-inbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          countryId,
          sourceType,
          sourceName,
          kind: draft.kind,
          title: draft.title,
          provider: draft.provider,
          confirmationNo: draft.confirmationNo,
          bookingDate: draft.bookingDate,
          bookingTime: draft.bookingTime,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Unable to save Trip Inbox item.");
      }

      setItems((current) => [
        {
          id: payload.id!,
          countryId,
          sourceType,
          sourceName,
          kind: draft.kind,
          title: draft.title,
          provider: draft.provider,
          confirmationNo: draft.confirmationNo,
          bookingDate: draft.bookingDate || null,
          bookingTime: draft.bookingTime || null,
          status: "INBOX",
          linkedTravelItemId: null,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setDraft(null);
      setText("");
      setSourceName("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save Trip Inbox item.",
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function addToPlan(id: string) {
    setBusy(true);
    setError("");
    setStatus("Adding reservation to Plan…");

    try {
      const response = await fetch(`/api/trip-inbox/${id}/add-to-plan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        travelItemId?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add to Plan.");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "ADDED",
                linkedTravelItemId:
                  payload.travelItemId ?? item.linkedTravelItemId,
              }
            : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add to Plan.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const onlyBasicFlightCode = Boolean(
    draft?.kind === "FLIGHT" &&
      draft.flightNumber &&
      !draft.bookingDate &&
      !draft.bookingTime &&
      !draft.route,
  );

  const onlyBookingReference = Boolean(
    draft?.kind === "BOOKING" &&
      draft.confirmationNo &&
      text.trim().toUpperCase() === draft.confirmationNo.toUpperCase(),
  );

  return (
    <div className="stack gap-lg trip-inbox-workspace">
      {busy ? (
        <SavingOverlay
          title={status || "Working"}
          message="Keeping your travel reservation organized."
        />
      ) : null}

      <section className="panel trip-inbox-import">
        <div>
          <p className="eyebrow">TRIP INBOX</p>
          <h2>Import a reservation</h2>
          <p className="muted">
            Paste an email, upload a screenshot, TXT/EML or PDF. Miles & Meals
            extracts useful booking details for review before anything is saved.
          </p>
        </div>

        <div className="trip-inbox-capability-note">
          <span aria-hidden="true">✈</span>
          <div>
            <strong>Flight number vs booking number</strong>
            <p>
              Enter a flight number such as <b>AK6128</b> plus its flight date to
              retrieve the matching schedule when the flight-data service is enabled.
              Booking confirmations are parsed using the departure section—not the
              booking-issued timestamp. Miles & Meals cannot securely retrieve a private airline reservation from a PNR/booking number alone.
            </p>
          </div>
        </div>

        <label>
          Trip
          <select
            value={countryId}
            onChange={(event) => {
              const nextId = event.target.value;
              setCountryId(nextId);
              setLookupDate(countryById.get(nextId)?.startDate ?? "");
              setScheduleMessage("");
            }}
          >
            {countries.map((country) => (
              <option key={country.id} value={country.id} title={`${country.tripName} · ${country.name}`}>
                {compactOptionText(`${country.tripName} · ${country.name}${country.financialStatus === "CLOSED" ? " · Closed" : ""}`, 42)}
              </option>
            ))}
          </select>
        </label>

        {tripClosed ? (
          <p className="form-warning" role="status">
            This Trip is closed and read-only. Existing reservations remain visible, but imports and Add to Plan are disabled until the Trip Owner reopens it from Settlement.
          </p>
        ) : null}

        <label className="booking-upload-button">
          Upload booking
          <input
            type="file"
            accept="image/*,.pdf,.txt,.eml,text/plain,message/rfc822,application/pdf"
            onChange={(event) => void filePicked(event)}
            disabled={tripClosed}
          />
        </label>

        <label>
          Flight number or booking confirmation
          <textarea
            rows={7}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSourceType("PASTE");
            }}
            placeholder="Example: AK6128, or paste the full flight / hotel / train / ticket confirmation here…"
            disabled={tripClosed}
          />
        </label>

        <button className="button secondary" type="button" disabled={tripClosed} onClick={() => analyze()}>
          Read details
        </button>
      </section>

      {draft ? (
        <section className="panel trip-inbox-review">
          <p className="eyebrow">REVIEW BEFORE SAVE</p>
          <fieldset className="owner-readonly-fieldset" disabled={tripClosed}>

          {draft.flightNumber ? (
            <>
              <div className="trip-inbox-detected-flight">
                <span>Flight</span>
                <strong>{draft.flightNumber}</strong>
                {draft.route ? <small>{draft.route}</small> : null}
              </div>
              <div className="flight-schedule-lookup">
                <label>
                  Flight date
                  <input type="date" value={lookupDate} onChange={(event) => setLookupDate(event.target.value)} />
                </label>
                <button className="button secondary" type="button" disabled={lookupBusy || tripClosed} onClick={() => void lookupFlightSchedule()}>
                  {lookupBusy ? "Retrieving…" : "Retrieve schedule"}
                </button>
                <small>Flight number + date are required because airline flight numbers repeat.</small>
              </div>
              {scheduleMessage ? <p className="form-success" role="status">{scheduleMessage}</p> : null}
            </>
          ) : null}

          {onlyBasicFlightCode ? (
            <p className="form-warning" role="status">
              Flight code detected. Choose the flight date and retrieve the exact
              matching schedule, or upload/paste the confirmation.
            </p>
          ) : null}

          {onlyBookingReference ? (
            <p className="form-warning" role="status">
              Booking reference detected. Miles & Meals can save the reference, but a
              private reservation cannot be retrieved from a PNR/booking number alone.
              Paste or upload the airline/hotel confirmation to extract the actual details.
            </p>
          ) : null}

          <div className="two-col">
            <label>
              Type
              <select
                value={draft.kind}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    kind: event.target.value as BookingImport["kind"],
                  })
                }
              >
                <option>FLIGHT</option>
                <option>HOTEL</option>
                <option>TRAIN</option>
                <option>TICKET</option>
                <option>BOOKING</option>
              </select>
            </label>

            <label>
              Confirmation / booking ref
              <input
                value={draft.confirmationNo}
                onChange={(event) =>
                  setDraft({ ...draft, confirmationNo: event.target.value })
                }
              />
            </label>
          </div>

          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>

          <label>
            Provider
            <input
              value={draft.provider}
              onChange={(event) =>
                setDraft({ ...draft, provider: event.target.value })
              }
            />
          </label>

          <div className="two-col">
            <label>
              Departure date
              <input
                type="date"
                value={draft.bookingDate}
                onChange={(event) =>
                  setDraft({ ...draft, bookingDate: event.target.value })
                }
              />
            </label>
            <label>
              Departure time · airport local
              <input
                type="time"
                value={draft.bookingTime}
                onChange={(event) =>
                  setDraft({ ...draft, bookingTime: event.target.value })
                }
              />
            </label>
          </div>

          <button className="button primary" type="button" disabled={tripClosed} onClick={() => void save()}>
            Save to Trip Inbox
          </button>
          </fieldset>
        </section>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">SAVED RESERVATIONS</p>
            <h2>Ready when you travel</h2>
          </div>
        </div>

        <div className="trip-inbox-list">
          {items.length ? (
            items.map((item) => {
              const country = countryById.get(item.countryId);
              return (
                <article className="trip-inbox-card" key={item.id}>
                  <div>
                    <span className="admin-status-pill active">{item.kind}</span>
                    <strong>{item.title}</strong>
                    <small>
                      {country?.tripName ?? "Trip"}
                      {item.bookingDate ? ` · ${item.bookingDate}` : ""}
                      {item.bookingTime ? ` · ${item.bookingTime}` : ""}
                    </small>
                    <small>
                      {item.provider || "Provider not detected"}
                      {item.confirmationNo ? ` · Ref ${item.confirmationNo}` : ""}
                    </small>
                  </div>

                  {item.status === "ADDED" ? (
                    <span className="success-text">✓ In Plan</span>
                  ) : (
                    <button
                      className="button secondary"
                      type="button"
                      disabled={country?.financialStatus === "CLOSED"}
                      onClick={() => void addToPlan(item.id)}
                    >
                      {country?.financialStatus === "CLOSED" ? "Trip closed" : "Add to Plan"}
                    </button>
                  )}
                </article>
              );
            })
          ) : (
            <p className="muted">No saved reservations yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
