"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import {
  applyFormStrings,
  clearDraft,
  draftKey,
  formDataStrings,
  readDraft,
  writeDraft,
} from "@/lib/draft-storage";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import { compactOptionText } from "@/lib/display-text";
import { PlanImport } from "@/components/PlanImport";
import { SmartDayRoute } from "@/components/SmartDayRoute";

type CountryOption = {
  id: string;
  name: string;
  tripName: string;
};

type TripOption = {
  id: string;
  name: string;
  financialStatus: string;
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
  ownerUserId: string | null;
  estimatedCost: string | null;
  quantity: string | null;
  provider: string | null;
  confirmationNo: string | null;
  linkUrl: string | null;
  notes: string | null;
  sortOrder: number;
  durationMinutes: number | null;
  createdBy: string;
  updatedAt: string;
  proposedByName: string | null;
};

const tabs = [
  ["ITINERARY", "Plan", "🗓️"],
  ["PLACE", "Places", "📍"],
  ["FOOD", "Meals", "🍜"],
  ["SHOPPING", "Shop", "🛍️"],
  ["CHECKLIST", "Tasks", "✓"],
  ["PACKING", "Pack", "🧳"],
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
  CHECKLIST: {
    title: "Ready before you go",
    subtitle: "Share visas, bookings and preparation tasks with the whole crew.",
    addLabel: "Add task",
    titleLabel: "Task",
    titlePlaceholder: "Check passport, buy insurance…",
    typePlaceholder: "Document / Booking / Group task",
  },
  PACKING: {
    title: "Pack once, travel lighter",
    subtitle: "Keep a shared packing list with quantities and completion status.",
    addLabel: "Add packing item",
    titleLabel: "Packing item",
    titlePlaceholder: "Passport, charger, running shoes…",
    typePlaceholder: "Essential / Clothing / Electronics",
  },
};

function formatDate(value: string | null): string {
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

function formatFullDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function expenseCategoryForItem(item: PlannerItem): string {
  const text = `${item.title} ${item.subtype ?? ""}`.toLowerCase();

  if (item.itemType === "FOOD") return "Food";
  if (item.itemType === "SHOPPING") return "Shopping";
  if (/flight|airline|airport/.test(text)) return "Flights";
  if (/hotel|hostel|resort|stay/.test(text)) return "Hotel";
  if (/taxi|grab|train|metro|bus|transfer|transport/.test(text)) return "Transport";
  if (item.itemType === "PLACE" || item.itemType === "ITINERARY") return "Attractions";
  return "Other";
}

function expenseHrefForItem(item: PlannerItem): string {
  const params = new URLSearchParams({
    countryId: item.countryId,
    description: item.title,
    category: expenseCategoryForItem(item),
  });

  if (item.itemDate) {
    params.set("date", item.itemDate);
  }

  return `/expenses/new?${params.toString()}`;
}

function statusClass(status: string | null): string {
  const normalized = status?.toLowerCase() ?? "";

  if (
    normalized.includes("done") ||
    normalized.includes("confirmed")
  ) {
    return "status-done";
  }

  if (normalized.includes("book")) {
    return "status-booked";
  }

  return "";
}

function formPayload(
  form: FormData,
  itemType: TabValue,
): Record<string, string> {
  return {
    countryId: String(form.get("countryId") ?? ""),
    itemType,
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
    sortOrder: String(form.get("sortOrder") ?? "0"),
    durationMinutes: String(form.get("durationMinutes") ?? ""),
  };
}

function PlannerItemForm({
  countries,
  itemType,
  defaultCountryId,
  initial,
  busy,
  error,
  draftStorageKey,
  onSubmit,
  onCancel,
}: {
  countries: CountryOption[];
  itemType: TabValue;
  defaultCountryId: string;
  initial?: PlannerItem;
  busy: boolean;
  error: string;
  draftStorageKey: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const meta = tabMeta[itemType];
  const editing = Boolean(initial);
  const formRef =
    useRef<HTMLFormElement>(null);
  const [draftState, setDraftState] =
    useState<
      "CHECKING" | "PENDING" | "ACTIVE"
    >("CHECKING");
  const [draftSavedAt, setDraftSavedAt] =
    useState<string | null>(null);

  useEffect(() => {
    const stored =
      readDraft<Record<string, string>>(
        draftStorageKey,
      );

    if (stored) {
      setDraftSavedAt(
        stored.savedAt,
      );
      setDraftState("PENDING");
      return;
    }

    setDraftState("ACTIVE");
  }, [draftStorageKey]);

  function saveDraftFromForm() {
    if (
      draftState !== "ACTIVE" ||
      !formRef.current
    ) {
      return;
    }

    writeDraft(
      draftStorageKey,
      formDataStrings(
        formRef.current,
      ),
    );
  }

  function restoreDraft() {
    const stored =
      readDraft<Record<string, string>>(
        draftStorageKey,
      );

    if (
      stored &&
      formRef.current
    ) {
      applyFormStrings(
        formRef.current,
        stored.data,
      );
    }

    setDraftState("ACTIVE");
  }

  function discardDraft() {
    clearDraft(
      draftStorageKey,
    );
    setDraftSavedAt(null);
    setDraftState("ACTIVE");
  }

  return (
    <form
      ref={formRef}
      className={editing ? "planner-edit-form" : "planner-add-form"}
      onSubmit={onSubmit}
      onInput={saveDraftFromForm}
      onChange={saveDraftFromForm}
    >
      {draftState === "PENDING" ? (
        <div className="draft-recovery-banner">
          <div>
            <strong>
              Unsaved planner draft found
            </strong>
            <small>
              {draftSavedAt
                ? `Saved ${new Date(
                    draftSavedAt,
                  ).toLocaleString(
                    "en-MY",
                  )}`
                : "A previous unfinished form is available."}
            </small>
          </div>

          <div>
            <button
              className="button primary"
              type="button"
              onClick={restoreDraft}
            >
              Restore
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={discardDraft}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
      <div className="section-heading">
        <span className="section-number amber">
          {editing ? "✎" : "＋"}
        </span>
        <div>
          <h2>
            {editing ? `Edit ${meta.titleLabel.toLowerCase()}` : meta.addLabel}
          </h2>
          <p>
            {editing
              ? "Update any detail below. The original proposer will remain visible."
              : "Add only what you need now. Everything else can stay optional."}
          </p>
        </div>
      </div>

      <div className="form-grid">
        <input type="hidden" name="sortOrder" value={initial?.sortOrder ?? 0} />
        <label>
          Trip
          <select
            name="countryId"
            required
            defaultValue={initial?.countryId ?? defaultCountryId}
          >
            {countries.map((country) => (
              <option value={country.id} key={country.id} title={country.tripName}>
                {compactOptionText(country.tripName, 32)}
              </option>
            ))}
          </select>
        </label>

        <label className="planner-native-field">
          Date
          <input
            className="planner-native-input"
            name="itemDate"
            type="date"
            defaultValue={initial?.itemDate ?? ""}
          />
        </label>

        <label className="span-2">
          {meta.titleLabel}
          <input
            name="title"
            required
            placeholder={meta.titlePlaceholder}
            defaultValue={initial?.title ?? ""}
          />
        </label>

        <label className="planner-native-field">
          Time
          <input
            className="planner-native-input"
            name="itemTime"
            type="time"
            defaultValue={initial?.itemTime ?? ""}
          />
        </label>

        {itemType === "ITINERARY" ? (
          <label>
            Duration
            <select name="durationMinutes" defaultValue={initial?.durationMinutes ?? 60}>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="240">4 hours</option>
              <option value="480">Full day</option>
            </select>
          </label>
        ) : null}

        <label>
          City / area
          <input
            name="area"
            placeholder="District 1 / Shibuya…"
            defaultValue={initial?.area ?? ""}
          />
        </label>

        <label>
          Type
          <input
            name="subtype"
            placeholder={meta.typePlaceholder}
            defaultValue={initial?.subtype ?? ""}
          />
        </label>

        <label>
          Status
          <select
            name="status"
            defaultValue={initial?.status ?? "Planned"}
          >
            <option>Planned</option>
            <option>Booked</option>
            <option>Confirmed</option>
            <option>Done</option>
            <option>Maybe</option>
          </select>
        </label>

        <label>
          Priority
          <select
            name="priority"
            defaultValue={initial?.priority ?? ""}
          >
            <option value="">Normal</option>
            <option>Must do</option>
            <option>High</option>
            <option>Optional</option>
          </select>
        </label>

        <label>
          Est. cost
          <input
            name="estimatedCost"
            inputMode="decimal"
              data-numeric-input="decimal"
            placeholder="Optional"
            defaultValue={initial?.estimatedCost ?? ""}
          />
        </label>

        {itemType === "SHOPPING" || itemType === "PACKING" ? (
          <label>
            Quantity
            <input
              name="quantity"
              inputMode="decimal"
              data-numeric-input="decimal"
              placeholder="1"
              defaultValue={initial?.quantity ?? ""}
            />
          </label>
        ) : null}

        {itemType === "ITINERARY" ? (
          <>
            <label>
              Provider
              <input
                name="provider"
                placeholder="Airline, hotel, tour…"
                defaultValue={initial?.provider ?? ""}
              />
            </label>
            <label>
              Confirmation number
              <input
                name="confirmationNo"
                placeholder="Optional"
                defaultValue={initial?.confirmationNo ?? ""}
              />
            </label>
          </>
        ) : null}

        <label className="span-2">
          Map / external link
          <input
            name="linkUrl"
            type="url"
            placeholder="https://..."
            defaultValue={initial?.linkUrl ?? ""}
          />
        </label>

        <label className="span-2">
          Notes
          <textarea
            name="notes"
            rows={3}
            placeholder="Anything the group should know?"
            defaultValue={initial?.notes ?? ""}
          />
        </label>
      </div>

      {error ? (
        <p className="form-error-banner" role="alert">
          {error}
        </p>
      ) : null}

      <div className="planner-form-actions">
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          className="button primary"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Saving…"
            : editing
              ? "Save changes"
              : meta.addLabel}
        </button>
      </div>
    </form>
  );
}

function PlannerDetailsModal({
  item,
  countryName,
  onClose,
}: {
  item: PlannerItem;
  countryName: string;
  onClose: () => void;
}) {
  const tabInfo = tabs.find(
    ([value]) => value === item.itemType,
  );

  const details = [
    ["Section", tabInfo?.[1] ?? item.itemType],
    ["Country", countryName],
    ["Date", formatFullDate(item.itemDate)],
    ["Time", item.itemTime || "—"],
    ["City / area", item.area || "—"],
    ["Type", item.subtype || "—"],
    ["Status", item.status || "—"],
    ["Priority", item.priority || "Normal"],
    ["Estimated cost", item.estimatedCost || "—"],
    ["Quantity", item.quantity || "—"],
    ["Provider", item.provider || "—"],
    ["Confirmation no.", item.confirmationNo || "—"],
    ["Proposed by", item.proposedByName ?? "Traveler"],
  ] as const;

  return (
    <div
      className="planner-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="planner-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-detail-title"
      >
        <header className="planner-detail-header">
          <div>
            <p className="eyebrow">
              {tabInfo?.[1] ?? "PLAN"}
            </p>
            <h2 id="planner-detail-title">
              {item.title}
            </h2>
          </div>

          <button
            className="planner-detail-close"
            type="button"
            aria-label="Close plan details"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="planner-detail-body">
          <div className="planner-detail-grid">
            {details.map(([label, value]) => (
              <div className="planner-detail-row" key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="planner-detail-block">
            <small>Notes</small>
            <p>{item.notes || "—"}</p>
          </div>

          <div className="planner-detail-block">
            <small>Map / external link</small>
            {item.linkUrl ? (
              <a
                className="button secondary planner-detail-link"
                href={item.linkUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open link ↗
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
        </div>

        <footer className="planner-detail-footer">
          <button
            className="button primary"
            type="button"
            onClick={onClose}
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}

export function PlannerClient({
  countries,
  items,
  trips,
  activeTripId,
}: {
  countries: CountryOption[];
  items: PlannerItem[];
  trips: TripOption[];
  activeTripId: string;
}) {
  const [itemsState, setItemsState] =
    useState<PlannerItem[]>(items);
  const [tab, setTab] = useState<TabValue>("ITINERARY");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [detailItem, setDetailItem] = useState<PlannerItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState("Updating your plan");

  const meta = tabMeta[tab];
  const activeTrip = trips.find((trip) => trip.id === activeTripId);
  const activeClosed = activeTrip?.financialStatus === "CLOSED";

  const visible = useMemo(() => {
    return itemsState
      .filter(
        (item) =>
          item.itemType === tab,
      )
      .sort((a, b) => {
        const dateA = a.itemDate ?? "9999-12-31";
        const dateB = b.itemDate ?? "9999-12-31";

        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }

        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return (a.itemTime ?? "99:99").localeCompare(
          b.itemTime ?? "99:99",
        );
      });
  }, [itemsState, tab]);

  const countryById = useMemo(
    () =>
      new Map(
        countries.map((country) => [country.id, country.tripName]),
      ),
    [countries],
  );

  const refreshItems =
    useCallback(async () => {
      if (
        !navigator.onLine ||
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      try {
        const response = await fetch(
          `/api/travel-items?t=${Date.now()}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const payload =
          (await response.json()) as {
          items: PlannerItem[];
        };

        setItemsState(
          payload.items,
        );
      } catch {
        // Keep the current planner visible if a background sync fails.
      }
    }, []);

  useEffect(() => {
    const timer = window.setInterval(
      () => void refreshItems(),
      20_000,
    );

    function refreshWhenVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshItems();
      }
    }

    window.addEventListener(
      "online",
      refreshWhenVisible,
    );
    window.addEventListener(
      "mnm:planner-updated",
      refreshWhenVisible,
    );
    window.addEventListener(
      "focus",
      refreshWhenVisible,
    );
    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "online",
        refreshWhenVisible,
      );
      window.removeEventListener(
        "mnm:planner-updated",
        refreshWhenVisible,
      );
      window.removeEventListener(
        "focus",
        refreshWhenVisible,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [refreshItems]);

  const defaultCountryId =
    countries[0]?.id ?? "";

  useEffect(() => {
    if (!detailItem) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailItem(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailItem]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeClosed) {
      setError("This Trip is closed and its Plan is read-only. Reopen it from Settlement before adding anything.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = formPayload(form, tab);

    if (!navigator.onLine) {
      try {
        enqueueOfflineMutation({
          url: "/api/travel-items",
          method: "POST",
          body: payload,
          label: "Planner item",
          meta: {
            tripId: activeTrip?.id,
            tripName: activeTrip?.name,
            description: payload.title,
          },
        });
        clearDraft(draftKey("planner", `new:${tab}`));
        formElement.reset();
        setShowForm(false);
        setError("Saved offline — this plan will appear for everyone after it syncs.");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to store this plan offline.",
        );
      }
      return;
    }

    setError("");
    setLoadingTitle(`Adding ${meta.titleLabel.toLowerCase()}`);
    setBusy(true);

    try {
      const response = await fetch("/api/travel-items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        throw new Error(payload.error ?? "Unable to add item.");
      }

      clearDraft(
        draftKey(
          "planner",
          `new:${tab}`,
        ),
      );
      formElement.reset();
      setShowForm(false);
      await refreshItems();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to add item.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeClosed) {
      setError("This Trip is closed and its Plan is read-only.");
      return;
    }

    if (!editingItem) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      ...formPayload(
        form,
        editingItem.itemType as TabValue,
      ),
      expectedUpdatedAt: editingItem.updatedAt,
    };

    if (!navigator.onLine) {
      try {
        enqueueOfflineMutation({
          url: `/api/travel-items/${editingItem.id}`,
          method: "PATCH",
          body: payload,
          label: "Planner update",
          meta: {
            tripId: activeTrip?.id,
            tripName: activeTrip?.name,
            description: editingItem.title,
          },
        });
        clearDraft(draftKey("planner", `edit:${editingItem.id}`));
        setEditingItem(null);
        setError("Update saved offline — it will sync when your connection returns.");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to store this update offline.",
        );
      }
      return;
    }

    setError("");
    setLoadingTitle(`Saving ${tabMeta[editingItem.itemType as TabValue].titleLabel.toLowerCase()}`);
    setBusy(true);

    try {
      const response = await fetch(
        `/api/travel-items/${editingItem.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };

        if (response.status === 409 && payload.code === "STALE_EDIT") {
          throw new Error(
            payload.error ??
              "This plan changed on another device. Refresh the latest version before saving.",
          );
        }

        throw new Error(payload.error ?? "Unable to update item.");
      }

      clearDraft(
        draftKey(
          "planner",
          `edit:${editingItem.id}`,
        ),
      );
      setEditingItem(null);
      await refreshItems();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update item.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (activeClosed) {
      setError("This Trip is closed and its Plan is read-only.");
      return;
    }

    if (!window.confirm("Delete this item?")) {
      return;
    }

    if (!navigator.onLine) {
      try {
        enqueueOfflineMutation({
          url: `/api/travel-items/${id}`,
          method: "DELETE",
          label: "Planner deletion",
          meta: {
            tripId: activeTrip?.id,
            tripName: activeTrip?.name,
            description: itemsState.find((item) => item.id === id)?.title,
          },
        });
        setItemsState((current) => current.filter((item) => item.id !== id));
        setEditingItem((current) => (current?.id === id ? null : current));
        setDetailItem((current) => (current?.id === id ? null : current));
        clearDraft(draftKey("planner", `edit:${id}`));
        setError("Deletion saved offline — it will sync when your connection returns.");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to store this deletion offline.",
        );
      }
      return;
    }

    setError("");
    setLoadingTitle("Removing plan item");
    setBusy(true);

    try {
      const response = await fetch(`/api/travel-items/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        throw new Error(payload.error ?? "Unable to delete item.");
      }

      if (editingItem?.id === id) {
        setEditingItem(null);
      }

      if (detailItem?.id === id) {
        setDetailItem(null);
      }

      clearDraft(
        draftKey(
          "planner",
          `edit:${id}`,
        ),
      );
      await refreshItems();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to delete item.",
      );
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: PlannerItem) {
    if (activeClosed) {
      setError("This Trip is closed and its Plan is read-only.");
      return;
    }

    setShowForm(false);
    setDetailItem(null);
    setError("");
    setEditingItem(item);

    window.requestAnimationFrame(() => {
      document
        .getElementById("planner-edit-panel")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  async function moveItem(item: PlannerItem, direction: -1 | 1) {
    if (activeClosed || !navigator.onLine) {
      setError(activeClosed ? "This Trip is closed and its Plan is read-only." : "Reconnect before reordering the shared plan.");
      return;
    }
    const group = visible.filter((candidate) =>
      candidate.countryId === item.countryId && candidate.itemDate === item.itemDate,
    );
    const index = group.findIndex((candidate) => candidate.id === item.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= group.length) return;
    const reordered = [...group];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];

    setItemsState((current) => current.map((candidate) => {
      const order = reordered.findIndex((entry) => entry.id === candidate.id);
      return order >= 0 ? { ...candidate, sortOrder: order + 1 } : candidate;
    }));

    try {
      const response = await fetch("/api/travel-items/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          countryId: item.countryId,
          itemDate: item.itemDate ?? "",
          itemIds: reordered.map((entry) => entry.id),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to reorder the plan.");
      await refreshItems();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reorder the plan.");
      await refreshItems();
    }
  }

  async function toggleDone(item: PlannerItem) {
    if (activeClosed) return;
    if (!navigator.onLine) {
      setError("Reconnect before changing checklist completion.");
      return;
    }
    const nextStatus = item.status === "Done" ? "Planned" : "Done";
    const response = await fetch(`/api/travel-items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        countryId: item.countryId,
        itemType: item.itemType,
        title: item.title,
        itemDate: item.itemDate ?? "",
        itemTime: item.itemTime ?? "",
        area: item.area ?? "",
        subtype: item.subtype ?? "",
        priority: item.priority ?? "",
        status: nextStatus,
        ownerUserId: item.ownerUserId ?? "",
        estimatedCost: item.estimatedCost ?? "",
        quantity: item.quantity ?? "",
        provider: item.provider ?? "",
        confirmationNo: item.confirmationNo ?? "",
        linkUrl: item.linkUrl ?? "",
        notes: item.notes ?? "",
        sortOrder: item.sortOrder,
        durationMinutes: item.durationMinutes ?? "",
        expectedUpdatedAt: item.updatedAt,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to update this item.");
      return;
    }
    await refreshItems();
  }

  async function changeTrip(nextTripId: string) {
    if (
      !nextTripId ||
      nextTripId === activeTripId
    ) {
      return;
    }

    if (!navigator.onLine) {
      window.location.assign("/offline.html");
      return;
    }

    setError("");
    setLoadingTitle("Switching trip");
    setBusy(true);

    try {
      const response = await fetch("/api/active-trip", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tripId: nextTripId,
        }),
      });

      const payload =
        (await response.json().catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Unable to switch trip.",
        );
      }

      window.location.assign("/planner");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to switch trip.",
      );
      setBusy(false);
    }
  }

  function switchTab(nextTab: TabValue) {
    setTab(nextTab);
    setShowForm(false);
    setEditingItem(null);
    setDetailItem(null);
    setError("");
  }

  if (countries.length === 0) {
    return (
      <article className="empty-card">
        <h2>No trip available yet</h2>
        <p>
          Ask the trip admin to give you access to a trip before adding plans.
        </p>
      </article>
    );
  }

  return (
    <div className="planner-shell">
      {busy ? (
        <SavingOverlay
          title={loadingTitle}
          message={
            loadingTitle === "Switching trip"
              ? "Opening the selected trip plan."
              : "Updating the shared trip plan for everyone."
          }
        />
      ) : null}
      <div
        className="planner-tabs"
        role="tablist"
        aria-label="Trip planner sections"
      >
        {tabs.map(([value, label, icon]) => (
          <button
            className={
              tab === value ? "planner-tab active" : "planner-tab"
            }
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
          <p className="eyebrow">
            {tabs.find(([value]) => value === tab)?.[1]}
          </p>
          <h2>{meta.title}</h2>
          <p>{meta.subtitle}</p>
        </div>

        <button
          className="button primary planner-add-button"
          onClick={() => {
            setEditingItem(null);
            setError("");
            setShowForm((value) => !value);
          }}
          type="button"
          disabled={activeClosed}
        >
          {activeClosed ? "Closed · Read-only" : showForm ? "Close" : `＋ ${meta.addLabel}`}
        </button>
      </section>

      {activeClosed ? (
        <p className="form-warning" role="status">
          This Trip is closed. You can review Plan details, but adding, editing, deleting and creating expenses are disabled until the Trip is reopened from Settlement.
        </p>
      ) : null}

      <div className="planner-filter">
        <label>
          <span>Trip</span>
          <select
            aria-label="Change planner trip"
            value={activeTripId}
            disabled={busy}
            onChange={(event) => {
              setEditingItem(null);
              setDetailItem(null);
              setShowForm(false);
              setError("");
              void changeTrip(event.target.value);
            }}
          >
            {trips.map((trip) => (
              <option value={trip.id} key={trip.id} title={trip.name}>
                {compactOptionText(`${trip.name}${trip.financialStatus === "CLOSED" ? " · Closed" : ""}`, 36)}
              </option>
            ))}
          </select>
        </label>

        <span className="planner-count">
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </span>
      </div>

      {tab === "ITINERARY" ? (
        <div className="planner-operations-bar">
          <PlanImport
            countryId={defaultCountryId}
            disabled={activeClosed}
            onImported={refreshItems}
          />
          <a
            className="button secondary"
            href={`/api/travel-items/calendar?tripId=${encodeURIComponent(activeTripId)}`}
          >
            Download calendar
          </a>
        </div>
      ) : null}

      {tab === "ITINERARY" ? <SmartDayRoute
        items={itemsState.filter((item) => item.itemType === "ITINERARY")}
        countryId={defaultCountryId}
        tripName={activeTrip?.name ?? "this Trip"}
        disabled={activeClosed}
        onUpdated={refreshItems}
      /> : null}

      {showForm && !activeClosed ? (
        <PlannerItemForm
          countries={countries}
          itemType={tab}
          defaultCountryId={defaultCountryId}
          busy={busy}
          error={error}
          draftStorageKey={draftKey(
            "planner",
            `new:${tab}`,
          )}
          onSubmit={add}
          onCancel={() => {
            setShowForm(false);
            setError("");
          }}
        />
      ) : null}

      {editingItem && !activeClosed ? (
        <div id="planner-edit-panel">
          <PlannerItemForm
            countries={countries}
            itemType={editingItem.itemType as TabValue}
            defaultCountryId={editingItem.countryId}
            initial={editingItem}
            busy={busy}
            error={error}
            draftStorageKey={draftKey(
              "planner",
              `edit:${editingItem.id}`,
            )}
            onSubmit={saveEdit}
            onCancel={() => {
              setEditingItem(null);
              setError("");
            }}
          />
        </div>
      ) : null}

      {error && !showForm && !editingItem ? (
        <p className="form-error-banner" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className={
          tab === "ITINERARY"
            ? "timeline-list"
            : "travel-card-grid"
        }
      >
        {visible.map((item) => {
          const tabInfo = tabs.find(
            ([value]) => value === item.itemType,
          );
          const countryName =
            countryById.get(item.countryId) ?? "Trip";

          return (
            <article
              className={
                tab === "ITINERARY"
                  ? "timeline-card"
                  : "travel-card"
              }
              key={item.id}
            >
              {tab === "ITINERARY" ? (
                <div className="timeline-time">
                  <strong>{item.itemTime || "—"}</strong>
                  <span>{formatDate(item.itemDate)}</span>
                </div>
              ) : (
                <div className="travel-card-icon">
                  {tabInfo?.[2] ?? "📌"}
                </div>
              )}

              <div className="travel-card-body">
                <div className="travel-card-topline">
                  <span>{countryName}</span>

                  {item.status ? (
                    <span
                      className={`status-pill ${statusClass(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  ) : null}
                </div>

                <h2>{item.title}</h2>

                <p className="travel-card-meta">
                  {[item.area, item.subtype]
                    .filter(Boolean)
                    .join(" · ") ||
                    (tab === "ITINERARY"
                      ? "Trip plan"
                      : formatDate(item.itemDate))}
                </p>

                {tab !== "ITINERARY" &&
                (item.itemDate || item.itemTime) ? (
                  <p className="travel-card-date">
                    {formatDate(item.itemDate)}
                    {item.itemTime
                      ? ` · ${item.itemTime}`
                      : ""}
                  </p>
                ) : null}

                {item.provider || item.confirmationNo ? (
                  <div className="provider-strip">
                    {item.provider ? (
                      <span>{item.provider}</span>
                    ) : null}

                    {item.confirmationNo ? (
                      <strong>#{item.confirmationNo}</strong>
                    ) : null}
                  </div>
                ) : null}

                {item.notes ? (
                  <p className="travel-notes">{item.notes}</p>
                ) : null}

                {item.linkUrl ? (
                  <div className="planner-card-link">
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open link ↗
                    </a>
                  </div>
                ) : null}

                <div className="planner-card-footer">
                  <div className="planner-proposer">
                    <span className="planner-proposer-icon">✦</span>
                    <span>
                      Proposed by{" "}
                      <strong>
                        {item.proposedByName ?? "Traveler"}
                      </strong>
                    </span>
                  </div>

                  <div className="planner-card-buttons">
                    {!activeClosed && visible.length > 1 ? (
                      <span className="planner-order-buttons" aria-label="Change item order">
                        <button type="button" onClick={() => void moveItem(item, -1)} aria-label={`Move ${item.title} earlier`}>↑</button>
                        <button type="button" onClick={() => void moveItem(item, 1)} aria-label={`Move ${item.title} later`}>↓</button>
                      </span>
                    ) : null}

                    {!activeClosed && (item.itemType === "CHECKLIST" || item.itemType === "PACKING") ? (
                      <button
                        className={item.status === "Done" ? "planner-done-button completed" : "planner-done-button"}
                        onClick={() => void toggleDone(item)}
                        type="button"
                      >
                        {item.status === "Done" ? "Undo" : "Mark done"}
                      </button>
                    ) : null}

                    <button
                      className="planner-detail-button"
                      onClick={() => setDetailItem(item)}
                      type="button"
                    >
                      View details
                    </button>

                    {!activeClosed ? (
                      <>
                        {item.itemType !== "CHECKLIST" && item.itemType !== "PACKING" ? (
                          <a
                            className="planner-expense-button"
                            href={expenseHrefForItem(item)}
                          >
                            Add expense
                          </a>
                        ) : null}

                        <button
                          className="planner-edit-button"
                          onClick={() => startEdit(item)}
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          className="text-danger"
                          onClick={() => remove(item.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {visible.length === 0 ? (
          <article className="planner-empty">
            <div>
              {tabs.find(([value]) => value === tab)?.[2]}
            </div>
            <h2>
              No{" "}
              {tabs
                .find(([value]) => value === tab)?.[1]
                .toLowerCase()}{" "}
              yet
            </h2>
            <p>{meta.subtitle}</p>
            {!activeClosed ? (
              <button
                className="button primary"
                onClick={() => setShowForm(true)}
                type="button"
              >
                {meta.addLabel}
              </button>
            ) : null}
          </article>
        ) : null}
      </section>

      {detailItem ? (
        <PlannerDetailsModal
          item={detailItem}
          countryName={
            countryById.get(detailItem.countryId) ?? "Trip"
          }
          onClose={() => setDetailItem(null)}
        />
      ) : null}
    </div>
  );
}
