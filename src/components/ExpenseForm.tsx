"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SavingOverlay } from "@/components/SavingOverlay";
import { splitEqually } from "@/lib/money";
import { parseTravelNumber } from "@/lib/numbers";

type CountryOption = {
  id: string;
  name: string;
  currencyCode: string;
  defaultExchangeRate: string;
  baseCurrency: string;
};

type Member = {
  id: string;
  name: string;
  email: string;
};

type ReceiptAnalysis = {
  merchantName: string | null;
  totalAmount: number | null;
  currencyCode: string | null;
  receiptDate: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

type ReceiptAnalyzeResponse = {
  receipt?: ReceiptAnalysis;
  error?: string;
};

type ReceiptUploadResponse = {
  receiptUrl?: string;
  error?: string;
};

type SplitMode = "EQUAL" | "PERCENTAGE" | "EXACT";
type RateType = "DEFAULT" | "CASH_EXCHANGE" | "CREDIT_CARD" | "MANUAL";

function normalizeOptionalActualCharge(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  const parsed = parseTravelNumber(trimmed);

  return parsed !== null && parsed > 0 ? trimmed : "";
}

type ExpenseInitial = {
  id: string;
  countryId: string;
  expenseDate: string;
  category: string;
  description: string;
  transactionCurrency: string;
  transactionAmount: string;
  exchangeRate: string;
  rateType: RateType;
  actualConvertedAmount: string | null;
  splitMode: SplitMode;
  paidByUserId: string;
  paymentMethod: string | null;
  receiptUrl: string | null;
  notes: string | null;
  splitUserIds: string[];
  splitValues: Record<string, string>;
};

const categories = [
  { value: "Food", label: "Meals", icon: "🍜" },
  { value: "Transport", label: "Travel", icon: "🚕" },
  { value: "Hotel", label: "Stay", icon: "🏨" },
  { value: "Shopping", label: "Shop", icon: "🛍️" },
  { value: "Attractions", label: "Things", icon: "🎟️" },
  { value: "Flights", label: "Flight", icon: "✈️" },
  { value: "Other", label: "Other", icon: "•••" },
] as const;

const rateTypes: { value: RateType; label: string }[] = [
  { value: "DEFAULT", label: "Default" },
  { value: "CASH_EXCHANGE", label: "Cash" },
  { value: "CREDIT_CARD", label: "Card" },
  { value: "MANUAL", label: "Manual" },
];

const splitModes: { value: SplitMode; label: string }[] = [
  { value: "EQUAL", label: "Equal" },
  { value: "PERCENTAGE", label: "%" },
  { value: "EXACT", label: "Exact" },
];

function equalPercentages(userIds: string[]): Record<string, string> {
  if (userIds.length === 0) {
    return {};
  }

  const base = Math.floor(10000 / userIds.length) / 100;
  let used = 0;

  return Object.fromEntries(
    userIds.map((userId, index) => {
      const value =
        index === userIds.length - 1
          ? Math.round((100 - used) * 100) / 100
          : base;
      used += value;
      return [userId, value.toFixed(2)];
    }),
  );
}

function localDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ExpenseForm({
  countries,
  initial,
}: {
  countries: CountryOption[];
  initial?: ExpenseInitial;
}) {
  const router = useRouter();
  const first =
    countries.find((country) => country.id === initial?.countryId) ??
    countries[0];

  const [countryId, setCountryId] = useState(first?.id ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Food");
  const [currency, setCurrency] = useState(
    initial?.transactionCurrency ?? first?.currencyCode ?? "",
  );
  const [rate, setRate] = useState(
    initial?.exchangeRate ?? first?.defaultExchangeRate ?? "1",
  );
  const [rateType, setRateType] = useState<RateType>(
    initial?.rateType ?? "DEFAULT",
  );
  const [amount, setAmount] = useState(initial?.transactionAmount ?? "");
  const [actualConvertedAmount, setActualConvertedAmount] = useState(
    normalizeOptionalActualCharge(initial?.actualConvertedAmount),
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>(
    initial?.splitMode ?? "EQUAL",
  );
  const [splitUserIds, setSplitUserIds] = useState<string[]>(
    initial?.splitUserIds ?? [],
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>(
    initial?.splitValues ?? {},
  );
  const [paidByUserId, setPaidByUserId] = useState(
    initial?.paidByUserId ?? "",
  );
  const [description, setDescription] = useState(
    initial?.description ?? "",
  );
  const [receiptUrl, setReceiptUrl] = useState(
    initial?.receiptUrl ?? "",
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [receiptResult, setReceiptResult] =
    useState<ReceiptAnalysis | null>(null);
  const [receiptMessage, setReceiptMessage] = useState("");
  const [savingMessage, setSavingMessage] = useState(
    "Updating the trip total and everyone’s share.",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const currentCountry = countries.find((country) => country.id === countryId);

  const converted = useMemo(() => {
    const parsedAmount = parseTravelNumber(amount);
    const parsedRate = parseTravelNumber(rate);

    if (
      parsedAmount === null ||
      parsedRate === null ||
      parsedAmount < 0 ||
      parsedRate < 0
    ) {
      return 0;
    }

    return parsedAmount * parsedRate;
  }, [amount, rate]);

  const settlementTotal = useMemo(() => {
    const actual = parseTravelNumber(actualConvertedAmount);

    if (
      rateType === "CREDIT_CARD" &&
      actualConvertedAmount.trim() !== "" &&
      actual !== null &&
      actual > 0
    ) {
      return actual;
    }

    return converted;
  }, [actualConvertedAmount, converted, rateType]);

  const equalShares = useMemo(() => {
    if (splitMode !== "EQUAL" || splitUserIds.length === 0) {
      return new Map<string, string>();
    }

    return new Map(
      splitEqually(settlementTotal, splitUserIds).map((split) => [
        split.userId,
        split.shareAmountBase,
      ]),
    );
  }, [settlementTotal, splitMode, splitUserIds]);

  const splitStatus = useMemo(() => {
    if (splitMode === "EQUAL") {
      return {
        label:
          splitUserIds.length > 0
            ? `${currentCountry?.baseCurrency ?? "MYR"} ${settlementTotal.toFixed(2)} shared by ${splitUserIds.length} ${splitUserIds.length === 1 ? "traveler" : "travelers"}`
            : "Choose at least one traveler",
        valid: splitUserIds.length > 0,
      };
    }

    const entered = splitUserIds.reduce(
      (sum, userId) => sum + (parseTravelNumber(splitValues[userId]) ?? 0),
      0,
    );

    if (splitMode === "PERCENTAGE") {
      return {
        label: `${entered.toFixed(2)}% assigned`,
        valid: Math.abs(entered - 100) < 0.01,
      };
    }

    return {
      label: `${currentCountry?.baseCurrency ?? "MYR"} ${entered.toFixed(2)} of ${settlementTotal.toFixed(2)}`,
      valid: Math.abs(entered - settlementTotal) < 0.01,
    };
  }, [
    currentCountry?.baseCurrency,
    settlementTotal,
    splitMode,
    splitUserIds,
    splitValues,
  ]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  useEffect(() => {
    if (!countryId) {
      return;
    }

    const controller = new AbortController();

    async function loadMembers() {
      const response = await fetch(`/api/countries/${countryId}/members`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        setMembers([]);
        return;
      }

      const payload = (await response.json()) as { members: Member[] };
      setMembers(payload.members);

      if (!initial || countryId !== initial.countryId) {
        const ids = payload.members.map((member) => member.id);
        setSplitUserIds(ids);
        setSplitValues(
          splitMode === "PERCENTAGE" ? equalPercentages(ids) : {},
        );
        setPaidByUserId(payload.members[0]?.id ?? "");
      }
    }

    loadMembers().catch(() => undefined);
    return () => controller.abort();
  }, [countryId, initial]);

  function handleCountryChange(nextId: string) {
    setCountryId(nextId);
    const country = countries.find((item) => item.id === nextId);

    if (country) {
      setCurrency(country.currencyCode);
      setRate(country.defaultExchangeRate);
      setRateType("DEFAULT");
      setActualConvertedAmount("");
      setReceiptResult(null);
      setReceiptMessage("");
    }
  }

  function handleRateType(nextType: RateType) {
    setRateType(nextType);

    if (nextType === "DEFAULT" && currentCountry) {
      setRate(currentCountry.defaultExchangeRate);
      setActualConvertedAmount("");
    }
  }

  function handleSplitMode(nextMode: SplitMode) {
    setSplitMode(nextMode);

    if (nextMode === "PERCENTAGE") {
      setSplitValues(equalPercentages(splitUserIds));
    } else if (nextMode === "EQUAL") {
      setSplitValues({});
    } else {
      setSplitValues(
        Object.fromEntries(splitUserIds.map((userId) => [userId, ""])),
      );
    }
  }

  function toggleSplit(userId: string) {
    setSplitUserIds((current) => {
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];

      if (splitMode === "PERCENTAGE") {
        setSplitValues(equalPercentages(next));
      } else {
        setSplitValues((values) => {
          const nextValues = { ...values };

          if (next.includes(userId)) {
            nextValues[userId] ??= "";
          } else {
            delete nextValues[userId];
          }

          return nextValues;
        });
      }

      return next;
    });
  }

  async function analyzeReceipt(file: File) {
    setReceiptScanning(true);
    setReceiptMessage("");
    setReceiptResult(null);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("countryId", countryId);

      const response = await fetch("/api/receipts/analyze", {
        method: "POST",
        body: form,
      });

      const payload =
        (await response.json().catch(() => ({}))) as ReceiptAnalyzeResponse;

      if (!response.ok || !payload.receipt) {
        throw new Error(
          payload.error ?? "Unable to read this receipt.",
        );
      }

      const detected = payload.receipt;
      setReceiptResult(detected);

      if (detected.merchantName) {
        setDescription(detected.merchantName);
      }

      if (
        detected.totalAmount !== null &&
        Number.isFinite(detected.totalAmount) &&
        detected.totalAmount > 0
      ) {
        setAmount(
          detected.totalAmount
            .toFixed(2)
            .replace(/\.00$/, ""),
        );
      }

      if (
        detected.currencyCode &&
        /^[A-Z]{3}$/.test(detected.currencyCode)
      ) {
        setCurrency(detected.currencyCode);
      }

      setReceiptMessage(
        detected.confidence === "LOW"
          ? "Receipt read with low confidence — please verify the shop name and amount."
          : "Receipt read. Please verify the detected fields before saving.",
      );
    } catch (caught) {
      setReceiptMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to analyze receipt.",
      );
    } finally {
      setReceiptScanning(false);
    }
  }

  function handleReceiptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }

    setReceiptFile(file);
    setReceiptPreviewUrl(URL.createObjectURL(file));
    void analyzeReceipt(file);

    event.target.value = "";
  }

  function removeReceiptPhoto() {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }

    setReceiptFile(null);
    setReceiptPreviewUrl("");
    setReceiptResult(null);
    setReceiptMessage("");
  }

  async function uploadReceiptPhoto(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("countryId", countryId);

    const response = await fetch("/api/receipts/upload", {
      method: "POST",
      body: form,
    });

    const payload =
      (await response.json().catch(() => ({}))) as ReceiptUploadResponse;

    if (!response.ok || !payload.receiptUrl) {
      throw new Error(
        payload.error ?? "Unable to store receipt photo.",
      );
    }

    return payload.receiptUrl;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (splitUserIds.length === 0) {
      setError("Choose at least one person to share this expense.");
      return;
    }

    if (!splitStatus.valid) {
      setError(
        splitMode === "PERCENTAGE"
          ? "Percentage shares must add up to 100%."
          : "Exact shares must add up to the amount being split.",
      );
      return;
    }

    const parsedAmount = parseTravelNumber(amount);
    const parsedRate = parseTravelNumber(rate);
    const parsedActual =
      actualConvertedAmount.trim() === ""
        ? null
        : parseTravelNumber(actualConvertedAmount);

    if (parsedAmount === null || parsedAmount <= 0) {
      setError(
        "Enter a valid transaction amount. You can use values like 150000 or 150,000.",
      );
      return;
    }

    if (parsedRate === null || parsedRate <= 0) {
      setError(
        "Enter a valid exchange rate. You can use values like 0.0001579.",
      );
      return;
    }

    if (
      actualConvertedAmount.trim() !== "" &&
      (parsedActual === null || parsedActual <= 0)
    ) {
      setError("Enter a valid actual card charge or leave it blank.");
      return;
    }

    const parsedSplits = splitUserIds.map((userId) => ({
      userId,
      value:
        splitMode === "EQUAL"
          ? 0
          : parseTravelNumber(splitValues[userId]) ?? Number.NaN,
    }));

    if (
      splitMode !== "EQUAL" &&
      parsedSplits.some(
        (split) => !Number.isFinite(split.value) || split.value < 0,
      )
    ) {
      setError("Enter a valid share for every selected traveler.");
      return;
    }

    setBusy(true);
    setSavingMessage(
      receiptFile
        ? "Uploading your receipt photo securely."
        : "Updating the trip total and everyone’s share.",
    );

    const form = new FormData(event.currentTarget);
    let finalReceiptUrl = receiptUrl.trim();

    try {
      if (receiptFile) {
        finalReceiptUrl = await uploadReceiptPhoto(receiptFile);
        setSavingMessage(
          "Receipt saved. Updating the trip total and everyone’s share.",
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to upload receipt photo.",
      );
      setBusy(false);
      return;
    }

    const body = {
      countryId,
      expenseDate: String(form.get("expenseDate") ?? ""),
      category,
      description,
      transactionCurrency: currency,
      transactionAmount: parsedAmount,
      exchangeRate: parsedRate,
      rateType,
      actualConvertedAmount:
        rateType === "CREDIT_CARD" && parsedActual !== null
          ? parsedActual
          : "",
      paidByUserId,
      paymentMethod: String(form.get("paymentMethod") ?? ""),
      receiptUrl: finalReceiptUrl,
      notes: String(form.get("notes") ?? ""),
      splitMode,
      splits: parsedSplits,
    };

    try {
      const response = await fetch(
        initial ? `/api/expenses/${initial.id}` : "/api/expenses",
        {
          method: initial ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(payload.error ?? "Unable to save expense.");
        setBusy(false);
        return;
      }

      router.push("/expenses");
      router.refresh();
    } catch {
      setError("Unable to reach Miles & Meals. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (countries.length === 0) {
    return (
      <article className="empty-card">
        <h2>No country available</h2>
        <p>Ask the trip admin to assign you to a country first.</p>
      </article>
    );
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title={initial ? "Saving your changes" : "Saving your expense"}
          message={savingMessage}
        />
      ) : null}
      <form className="expense-editor" onSubmit={submit}>
      <section className="expense-section amount-section">
        <div className="section-heading">
          <span className="section-number">1</span>
          <div>
            <h2>What did you spend?</h2>
            <p>Record the original amount exactly as you paid it.</p>
          </div>
        </div>

        <div className="two-col compact-fields">
          <label>
            Country
            <select
              value={countryId}
              onChange={(event) => handleCountryChange(event.target.value)}
            >
              {countries.map((country) => (
                <option value={country.id} key={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input
              name="expenseDate"
              type="date"
              required
              defaultValue={initial?.expenseDate ?? localDateString()}
            />
          </label>
        </div>

        <label className="description-field">
          Description
          <input
            name="description"
            required
            maxLength={250}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Shop name or expense description"
          />
        </label>

        <div>
          <span className="field-label">Category</span>
          <div className="category-grid" role="group" aria-label="Expense category">
            {categories.map((item) => (
              <button
                className={category === item.value ? "category-chip active" : "category-chip"}
                key={item.value}
                onClick={() => setCategory(item.value)}
                type="button"
              >
                <span className="category-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="money-entry">
          <label className="currency-control">
            Currency
            <input
              value={currency}
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              aria-label="Transaction currency"
            />
          </label>
          <label className="amount-control">
            Amount
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              placeholder="0.00"
              aria-label="Transaction amount"
            />
          </label>
        </div>
      </section>

      <section className="expense-section fx-section">
        <div className="section-heading">
          <span className="section-number amber">2</span>
          <div>
            <h2>Exchange rate</h2>
            <p>Use the actual cash or card rate for accurate trip totals.</p>
          </div>
        </div>

        <div className="segmented-control" role="group" aria-label="Exchange rate source">
          {rateTypes.map((item) => (
            <button
              className={rateType === item.value ? "segment active" : "segment"}
              key={item.value}
              onClick={() => handleRateType(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="fx-row">
          <label>
            1 {currency || "CUR"} =
            <input
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              required
            />
          </label>
          <div className="fx-currency">
            {currentCountry?.baseCurrency ?? "MYR"}
          </div>
        </div>

        <div className="conversion-hero">
          <div>
            <span>Trip amount</span>
            <strong>
              {currentCountry?.baseCurrency ?? "MYR"} {converted.toFixed(2)}
            </strong>
          </div>
          <small>
            This rate is stored with the expense, so future default-rate changes
            will not change this record.
          </small>
        </div>

        {rateType === "CREDIT_CARD" ? (
          <label className="actual-charge">
            Actual card charge in {currentCountry?.baseCurrency ?? "MYR"}
            <input
              inputMode="decimal"
              value={actualConvertedAmount}
              onChange={(event) => setActualConvertedAmount(event.target.value)}
              placeholder={`Optional — e.g. ${converted.toFixed(2)}`}
            />
            <small>Enter this later when the final bank/card amount is available.</small>
          </label>
        ) : null}
      </section>

      <section className="expense-section people-section">
        <div className="section-heading">
          <span className="section-number">3</span>
          <div>
            <h2>Who paid & who shares?</h2>
            <p>Only people assigned to this country are available.</p>
          </div>
        </div>

        <div>
          <span className="field-label">Paid by</span>
          <div className="people-scroll" role="group" aria-label="Paid by">
            {members.map((member) => (
              <button
                className={paidByUserId === member.id ? "person-pill active" : "person-pill"}
                key={member.id}
                onClick={() => setPaidByUserId(member.id)}
                type="button"
              >
                <span className="avatar">{initials(member.name)}</span>
                <span>{member.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="split-heading-row">
          <span className="field-label">Split with</span>
          <div className="mini-segments" role="group" aria-label="Split method">
            {splitModes.map((item) => (
              <button
                className={splitMode === item.value ? "mini-segment active" : "mini-segment"}
                key={item.value}
                onClick={() => handleSplitMode(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="member-split-list">
          {members.map((member) => {
            const selected = splitUserIds.includes(member.id);

            return (
              <div className={selected ? "member-split-card selected" : "member-split-card"} key={member.id}>
                <button
                  className="member-select"
                  onClick={() => toggleSplit(member.id)}
                  type="button"
                  aria-pressed={selected}
                >
                  <span className="avatar">{initials(member.name)}</span>
                  <span className="member-copy">
                    <strong>{member.name}</strong>
                    <small>{selected ? "Sharing" : "Not included"}</small>
                  </span>
                  <span className={selected ? "round-check checked" : "round-check"}>
                    {selected ? "✓" : ""}
                  </span>
                </button>

                {selected && splitMode !== "EQUAL" ? (
                  <label className="split-input">
                    <span>
                      {splitMode === "PERCENTAGE"
                        ? "%"
                        : currentCountry?.baseCurrency ?? "MYR"}
                    </span>
                    <input
                      inputMode="decimal"
                      value={splitValues[member.id] ?? ""}
                      onChange={(event) =>
                        setSplitValues((values) => ({
                          ...values,
                          [member.id]: event.target.value,
                        }))
                      }
                      required
                      aria-label={`${member.name} split value`}
                    />
                  </label>
                ) : selected ? (
                  <strong className="equal-share">
                    {currentCountry?.baseCurrency ?? "MYR"}{" "}
                    {equalShares.get(member.id) ?? "0.00"}
                  </strong>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className={splitStatus.valid ? "split-summary valid" : "split-summary invalid"}>
          <span>{splitStatus.valid ? "✓" : "!"}</span>
          <strong>{splitStatus.label}</strong>
        </div>
      </section>

      <section className="expense-section receipt-section">
        <div className="section-heading">
          <span className="section-number amber">4</span>
          <div>
            <h2>Scan receipt</h2>
            <p>
              Take a clear photo and Miles & Meals will fill the shop name and
              final amount for you.
            </p>
          </div>
        </div>

        <div className="receipt-scanner">
          <label className="receipt-camera-button">
            <input
              className="receipt-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleReceiptFile}
              disabled={receiptScanning || busy}
            />
            <span className="receipt-camera-icon">📷</span>
            <span>
              <strong>
                {receiptFile ? "Take another photo" : "Take receipt photo"}
              </strong>
              <small>Camera or photo library · JPEG / PNG / WebP</small>
            </span>
          </label>

          {receiptPreviewUrl ? (
            <div className="receipt-preview-card">
              <img
                src={receiptPreviewUrl}
                alt="Receipt preview"
                className="receipt-preview-image"
              />
              <button
                className="receipt-remove-button"
                type="button"
                onClick={removeReceiptPhoto}
                disabled={receiptScanning || busy}
              >
                Remove
              </button>
            </div>
          ) : initial?.receiptUrl ? (
            <div className="receipt-existing">
              <span>🧾</span>
              <div>
                <strong>Receipt already attached</strong>
                <small>
                  Take a new photo above if you want to replace it.
                </small>
              </div>
            </div>
          ) : null}

          {receiptScanning ? (
            <div className="receipt-ai-status scanning" role="status">
              <span className="mini-spinner" />
              <div>
                <strong>Reading receipt…</strong>
                <small>Finding the shop name and final total.</small>
              </div>
            </div>
          ) : receiptMessage ? (
            <div
              className={
                receiptResult
                  ? "receipt-ai-status success"
                  : "receipt-ai-status warning"
              }
              role="status"
            >
              <span>{receiptResult ? "✓" : "!"}</span>
              <div>
                <strong>
                  {receiptResult ? "Receipt scanned" : "Could not auto-fill"}
                </strong>
                <small>{receiptMessage}</small>
              </div>
            </div>
          ) : null}

          {receiptResult ? (
            <div className="receipt-detected-grid">
              <div>
                <small>Shop</small>
                <strong>
                  {receiptResult.merchantName ?? "Not detected"}
                </strong>
              </div>
              <div>
                <small>Total</small>
                <strong>
                  {receiptResult.currencyCode ?? currency}{" "}
                  {receiptResult.totalAmount?.toFixed(2) ?? "—"}
                </strong>
              </div>
              <div>
                <small>Confidence</small>
                <strong>{receiptResult.confidence}</strong>
              </div>
            </div>
          ) : null}

          <p className="receipt-ai-note">
            AI can misread receipts. Check Description, Currency and Amount
            before saving.
          </p>
        </div>
      </section>

      <section className="expense-section details-section">
        <div className="section-heading">
          <span className="section-number">5</span>
          <div>
            <h2>Payment details</h2>
            <p>Optional information that helps you reconcile later.</p>
          </div>
        </div>

        <div className="two-col compact-fields">
          <label>
            Payment method
            <input
              name="paymentMethod"
              defaultValue={initial?.paymentMethod ?? ""}
              placeholder="Maybank Visa / Cash / Wise"
            />
          </label>

          <label>
            Receipt / link
            <input
              name="receiptUrl"
              type="url"
              value={receiptUrl}
              onChange={(event) => setReceiptUrl(event.target.value)}
              placeholder="Optional external receipt URL"
            />
          </label>
        </div>

        <label>
          Notes
          <textarea
            name="notes"
            defaultValue={initial?.notes ?? ""}
            rows={3}
            placeholder="Optional note"
          />
        </label>
      </section>

      {error ? <p className="form-error-banner">{error}</p> : null}

      <div className="sticky-save">
        <div className="save-total">
          <span>Total</span>
          <strong>
            {currentCountry?.baseCurrency ?? "MYR"} {settlementTotal.toFixed(2)}
          </strong>
        </div>
        <button className="button primary save-expense-button" disabled={busy} type="submit">
          {busy ? "Saving…" : initial ? "Save changes" : "Save expense"}
        </button>
      </div>
      </form>
    </>
  );
}
