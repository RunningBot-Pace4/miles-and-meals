"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CountryOption = {
  id: string;
  name: string;
};

type PlannerItem = {
  id: string;
  countryId: string;
  itemType: string;
  title: string;
  itemDate: string | null;
  itemTime: string | null;
  area: string | null;
  subtype: string | null;
  priority: string | null;
  status: string | null;
  estimatedCost: string | null;
  quantity: string | null;
  provider: string | null;
  confirmationNo: string | null;
  linkUrl: string | null;
  notes: string | null;
};

const tabs = [
  ["ITINERARY", "Plan", "🗓️"],
  ["PLACE", "Places", "📍"],
  ["FOOD", "Meals", "🍜"],
  ["SHOPPING", "Shop", "🛍️"],
  ["BOOKING", "Bookings", "🎫"],
] as const;

type TabValue = (typeof tabs)[number][0];

const tabMeta: Record<
  TabValue,
  {
    title: string;
    subtitle: string;
    addLabel: string;
    titleLabel: string;
    titlePlaceholder: string;
    typePlaceholder: string;
  }
> = {
  ITINERARY: {
    title: "Your day, at a glance",
    subtitle: "Keep the next stop easy to find while everyone is moving.",
    addLabel: "Add plan",
    titleLabel: "Activity",
    titlePlaceholder: "Breakfast, museum, check-in…",
    typePlaceholder: "Activity / Sightseeing / Transfer",
  },
  PLACE: {
    title: "Places worth the miles",
    subtitle: "Save sights, neighbourhoods and map links before you need them.",
    addLabel: "Add place",
    titleLabel: "Place name",
    titlePlaceholder: "Pink Church, Ben Thanh Market…",
    typePlaceholder: "Sightseeing / Market / Photo spot",
  },
  FOOD: {
    title: "Meals worth remembering",
    subtitle: "Keep cafes, restaurants and must-try dishes in one list.",
    addLabel: "Add meal",
    titleLabel: "Restaurant / cafe",
    titlePlaceholder: "Pho Hoa Pasteur…",
    typePlaceholder: "Cafe / Local food / Dinner",
  },
  SHOPPING: {
    title: "Bring something home",
    subtitle: "Track must-buy items, quantities and where to find them.",
    addLabel: "Add shopping item",
    titleLabel: "Item",
    titlePlaceholder: "Coffee beans, souvenir…",
    typePlaceholder: "Gift / Snack / Fashion",
  },
  BOOKING: {
    title: "Bookings without the inbox hunt",
    subtitle: "Keep flights, hotels and confirmation details close at hand.",
    addLabel: "Add booking",
    titleLabel: "Booking name",
    titlePlaceholder: "Hotel, flight, attraction…",
    typePlaceholder: "Hotel / Flight / Ticket",
  },
};

function formatDate(value: string | null) {
  if (!value) {
    return "Any day";
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

function statusClass(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("done") || normalized.includes("confirmed")) {
    return "status-done";
  }
  if (normalized.includes("book")) {
    return "status-booked";
  }
  return "";
}

export function PlannerClient({
  countries,
  items,
}: {
  countries: CountryOption[];
  items: PlannerItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>("ITINERARY");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const meta = tabMeta[tab];

  const visible = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.itemType === tab &&
          (countryFilter === "ALL" || item.countryId === countryFilter),
      )
      .sort((a, b) => {
        const dateA = a.itemDate ?? "9999-12-31";
        const dateB = b.itemDate ?? "9999-12-31";
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        return (a.itemTime ?? "99:99").localeCompare(b.itemTime ?? "99:99");
      });
  }, [countryFilter, items, tab]);

  const countryById = useMemo(
    () => new Map(countries.map((country) => [country.id, country.name])),
    [countries],
  );

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/travel-items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        countryId: String(form.get("countryId") ?? ""),
        itemType: tab,
        title: String(form.get("title") ?? ""),
        itemDate: String(form.get("itemDate") ?? ""),
        itemTime: String(form.get("itemTime") ?? ""),
        area: String(form.get("area") ?? ""),
        subtype: String(form.get("subtype") ?? ""),
        priority: String(form.get("priority") ?? ""),
        status: String(form.get("status") ?? ""),
        estimatedCost: String(form.get("estimatedCost") ?? ""),
        quantity: String(form.get("quantity") ?? ""),
        provider: String(form.get("provider") ?? ""),
        confirmationNo: String(form.get("confirmationNo") ?? ""),
        linkUrl: String(form.get("linkUrl") ?? ""),
        notes: String(form.get("notes") ?? ""),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(payload.error ?? "Unable to add item.");
      setBusy(false);
      return;
    }

    event.currentTarget.reset();
    setBusy(false);
    setShowForm(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this item?")) {
      return;
    }

    const response = await fetch(`/api/travel-items/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      router.refresh();
    }
  }

  function switchTab(nextTab: TabValue) {
    setTab(nextTab);
    setShowForm(false);
    setError("");
  }

  if (countries.length === 0) {
    return (
      <article className="empty-card">
        <h2>No country assigned yet</h2>
        <p>Ask the trip admin to assign you to a country before adding plans.</p>
      </article>
    );
  }

  return (
    <div className="planner-shell">
      <div className="planner-tabs" role="tablist" aria-label="Trip planner sections">
        {tabs.map(([value, label, icon]) => (
          <button
            className={tab === value ? "planner-tab active" : "planner-tab"}
            key={value}
            onClick={() => switchTab(value)}
            type="button"
          >
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>

      <section className="planner-intro">
        <div>
          <p className="eyebrow">{tabs.find(([value]) => value === tab)?.[1]}</p>
          <h2>{meta.title}</h2>
          <p>{meta.subtitle}</p>
        </div>
        <button className="button primary planner-add-button" onClick={() => setShowForm((value) => !value)} type="button">
          {showForm ? "Close" : `＋ ${meta.addLabel}`}
        </button>
      </section>

      <div className="planner-filter">
        <label>
          <span>Showing</span>
          <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
            <option value="ALL">All my countries</option>
            {countries.map((country) => (
              <option value={country.id} key={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <span className="planner-count">
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </span>
      </div>

      {showForm ? (
        <form className="planner-add-form" onSubmit={add}>
          <div className="section-heading">
            <span className="section-number amber">＋</span>
            <div>
              <h2>{meta.addLabel}</h2>
              <p>Add only what you need now. Everything else can stay optional.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Country
              <select name="countryId" required defaultValue={countryFilter === "ALL" ? countries[0]?.id : countryFilter}>
                {countries.map((country) => (
                  <option value={country.id} key={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input name="itemDate" type="date" />
            </label>

            <label className="span-2">
              {meta.titleLabel}
              <input name="title" required placeholder={meta.titlePlaceholder} />
            </label>

            <label>
              Time
              <input name="itemTime" type="time" />
            </label>

            <label>
              City / area
              <input name="area" placeholder="District 1 / Shibuya…" />
            </label>

            <label>
              Type
              <input name="subtype" placeholder={meta.typePlaceholder} />
            </label>

            <label>
              Status
              <select name="status" defaultValue="Planned">
                <option>Planned</option>
                <option>Booked</option>
                <option>Confirmed</option>
                <option>Done</option>
                <option>Maybe</option>
              </select>
            </label>

            <label>
              Priority
              <select name="priority" defaultValue="">
                <option value="">Normal</option>
                <option>Must do</option>
                <option>High</option>
                <option>Optional</option>
              </select>
            </label>

            <label>
              Est. cost
              <input name="estimatedCost" inputMode="decimal" placeholder="Optional" />
            </label>

            {tab === "SHOPPING" ? (
              <label>
                Quantity
                <input name="quantity" inputMode="decimal" placeholder="1" />
              </label>
            ) : null}

            {tab === "BOOKING" ? (
              <>
                <label>
                  Provider
                  <input name="provider" placeholder="AirAsia / Agoda…" />
                </label>
                <label>
                  Confirmation no.
                  <input name="confirmationNo" />
                </label>
              </>
            ) : null}

            <label className="span-2">
              Map / booking link
              <input name="linkUrl" type="url" placeholder="https://..." />
            </label>

            <label className="span-2">
              Notes
              <textarea name="notes" rows={3} placeholder="Anything the group should know?" />
            </label>
          </div>

          {error ? <p className="form-error-banner">{error}</p> : null}

          <button className="button primary full" disabled={busy} type="submit">
            {busy ? "Saving…" : meta.addLabel}
          </button>
        </form>
      ) : null}

      <section className={tab === "ITINERARY" ? "timeline-list" : "travel-card-grid"}>
        {visible.map((item) => {
          const tabInfo = tabs.find(([value]) => value === item.itemType);
          const countryName = countryById.get(item.countryId) ?? "Trip";

          return (
            <article
              className={tab === "ITINERARY" ? "timeline-card" : "travel-card"}
              key={item.id}
            >
              {tab === "ITINERARY" ? (
                <div className="timeline-time">
                  <strong>{item.itemTime || "—"}</strong>
                  <span>{formatDate(item.itemDate)}</span>
                </div>
              ) : (
                <div className="travel-card-icon">{tabInfo?.[2] ?? "📌"}</div>
              )}

              <div className="travel-card-body">
                <div className="travel-card-topline">
                  <span>{countryName}</span>
                  {item.status ? (
                    <span className={`status-pill ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  ) : null}
                </div>

                <h2>{item.title}</h2>

                <p className="travel-card-meta">
                  {[item.area, item.subtype].filter(Boolean).join(" · ") ||
                    (tab === "ITINERARY" ? "Trip plan" : formatDate(item.itemDate))}
                </p>

                {tab !== "ITINERARY" && (item.itemDate || item.itemTime) ? (
                  <p className="travel-card-date">
                    {formatDate(item.itemDate)}
                    {item.itemTime ? ` · ${item.itemTime}` : ""}
                  </p>
                ) : null}

                {item.provider || item.confirmationNo ? (
                  <div className="booking-strip">
                    {item.provider ? <span>{item.provider}</span> : null}
                    {item.confirmationNo ? <strong>#{item.confirmationNo}</strong> : null}
                  </div>
                ) : null}

                {item.notes ? <p className="travel-notes">{item.notes}</p> : null}

                <div className="travel-card-actions">
                  {item.linkUrl ? (
                    <a href={item.linkUrl} target="_blank" rel="noreferrer">
                      {tab === "BOOKING" ? "Open booking ↗" : "Open map ↗"}
                    </a>
                  ) : <span />}
                  <button className="text-danger" onClick={() => remove(item.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {visible.length === 0 ? (
          <article className="planner-empty">
            <div>{tabs.find(([value]) => value === tab)?.[2]}</div>
            <h2>No {tabs.find(([value]) => value === tab)?.[1].toLowerCase()} yet</h2>
            <p>{meta.subtitle}</p>
            <button className="button primary" onClick={() => setShowForm(true)} type="button">
              {meta.addLabel}
            </button>
          </article>
        ) : null}
      </section>
    </div>
  );
}
