"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import {
  clearDraft,
  draftKey,
  readDraft,
  writeDraft,
} from "@/lib/draft-storage";
import { sameCurrency, splitEqually } from "@/lib/money";
import { parseTravelNumber } from "@/lib/numbers";

type CountryOption = {
  id: string;
  name: string;
  tripId: string;
  tripName: string;
  currencyCode: string;
  defaultExchangeRate: string;
  baseCurrency: string;
};

type Member = {
  id: string;
  name: string;
};

type ReceiptAnalysis = {
  merchantName: string | null;
  merchantCandidates: string[];
  totalAmount: number | null;
  totalCandidates: number[];
  currencyCode: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  merchantConfidence: "HIGH" | "MEDIUM" | "LOW";
  totalConfidence: "HIGH" | "MEDIUM" | "LOW";
  rawText: string;
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

type ExpenseDraft = {
  countryId: string;
  expenseDate: string;
  category: string;
  currency: string;
  rate: string;
  rateType: RateType;
  amount: string;
  actualConvertedAmount: string;
  splitMode: SplitMode;
  splitUserIds: string[];
  splitValues: Record<string, string>;
  paidByUserId: string;
  description: string;
  receiptUrl: string;
  paymentMethod: string;
  notes: string;
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

const commonCurrencies = [
  ["MYR", "Malaysian Ringgit"],
  ["SGD", "Singapore Dollar"],
  ["THB", "Thai Baht"],
  ["VND", "Vietnamese Dong"],
  ["IDR", "Indonesian Rupiah"],
  ["PHP", "Philippine Peso"],
  ["USD", "US Dollar"],
  ["JPY", "Japanese Yen"],
  ["KRW", "South Korean Won"],
  ["CNY", "Chinese Yuan"],
  ["HKD", "Hong Kong Dollar"],
  ["TWD", "New Taiwan Dollar"],
  ["AUD", "Australian Dollar"],
  ["NZD", "New Zealand Dollar"],
  ["EUR", "Euro"],
  ["GBP", "British Pound"],
  ["CHF", "Swiss Franc"],
  ["CAD", "Canadian Dollar"],
  ["AED", "UAE Dirham"],
  ["SAR", "Saudi Riyal"],
] as const;

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
  activeTripId,
  currentUserId,
  initial,
}: {
  countries: CountryOption[];
  activeTripId: string;
  currentUserId: string;
  initial?: ExpenseInitial;
}) {
  const first =
    countries.find((country) => country.id === initial?.countryId) ??
    countries.find((country) => country.tripId === activeTripId) ??
    countries[0];

  const startingCurrency = (
    initial?.transactionCurrency ??
    first?.currencyCode ??
    ""
  ).toUpperCase();

  const startingRate =
    first && sameCurrency(startingCurrency, first.baseCurrency)
      ? "1"
      : initial?.exchangeRate ?? first?.defaultExchangeRate ?? "1";

  const [countryId, setCountryId] = useState(first?.id ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Food");
  const [currency, setCurrency] = useState(startingCurrency);
  const [rate, setRate] = useState(startingRate);
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
    initial?.splitUserIds ??
      (currentUserId ? [currentUserId] : []),
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>(
    initial?.splitValues ?? {},
  );
  const [paidByUserId, setPaidByUserId] = useState(
    initial?.paidByUserId ?? currentUserId,
  );
  const [description, setDescription] = useState(
    initial?.description ?? "",
  );
  const [expenseDate, setExpenseDate] = useState(
    initial?.expenseDate ?? localDateString(),
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initial?.paymentMethod ?? "",
  );
  const [notes, setNotes] = useState(
    initial?.notes ?? "",
  );
  const [receiptUrl, setReceiptUrl] = useState(
    initial?.receiptUrl ?? "",
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [receiptScanStatus, setReceiptScanStatus] = useState("");
  const [receiptScanProgress, setReceiptScanProgress] = useState(0);
  const [receiptResult, setReceiptResult] =
    useState<ReceiptAnalysis | null>(null);
  const [receiptMessage, setReceiptMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tripSwitching, setTripSwitching] = useState(false);
  const [fxRateLoading, setFxRateLoading] = useState(false);
  const [fxRateMessage, setFxRateMessage] = useState("");
  const fxRequestIdRef = useRef(0);

  const expenseDraftKey = draftKey(
    "expense",
    initial
      ? `edit:${initial.id}`
      : "new",
  );
  const [draftState, setDraftState] =
    useState<
      "CHECKING" | "PENDING" | "ACTIVE"
    >("CHECKING");
  const [draftSavedAt, setDraftSavedAt] =
    useState<string | null>(null);
  const [draftDirty, setDraftDirty] =
    useState(false);
  const preserveMembersRef =
    useRef(false);

  const currentCountry = countries.find(
    (country) => country.id === countryId,
  );
  const isBaseCurrency = sameCurrency(
    currency,
    currentCountry?.baseCurrency,
  );

  const currencyOptions = useMemo(() => {
    const labels = new Map<string, string>(
      commonCurrencies.map(([code, label]) => [code, label]),
    );

    if (currentCountry?.currencyCode) {
      labels.set(
        currentCountry.currencyCode.toUpperCase(),
        labels.get(currentCountry.currencyCode.toUpperCase()) ??
          "Trip default currency",
      );
    }

    if (currentCountry?.baseCurrency) {
      labels.set(
        currentCountry.baseCurrency.toUpperCase(),
        labels.get(currentCountry.baseCurrency.toUpperCase()) ??
          "Trip base currency",
      );
    }

    if (/^[A-Z]{3}$/.test(currency)) {
      labels.set(
        currency,
        labels.get(currency) ?? "Detected currency",
      );
    }

    const preferred = [
      currentCountry?.currencyCode?.toUpperCase(),
      currentCountry?.baseCurrency?.toUpperCase(),
    ].filter((value): value is string => Boolean(value));

    return [...labels.entries()]
      .map(([code, label]) => ({
        code,
        label,
        preferred: preferred.indexOf(code),
      }))
      .sort((left, right) => {
        if (left.preferred >= 0 || right.preferred >= 0) {
          if (left.preferred < 0) return 1;
          if (right.preferred < 0) return -1;
          return left.preferred - right.preferred;
        }

        return left.code.localeCompare(right.code);
      });
  }, [
    currency,
    currentCountry?.baseCurrency,
    currentCountry?.currencyCode,
  ]);

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
    const stored =
      readDraft<ExpenseDraft>(
        expenseDraftKey,
      );

    if (stored) {
      setDraftSavedAt(
        stored.savedAt,
      );
      setDraftState("PENDING");
      return;
    }

    setDraftState("ACTIVE");
  }, [expenseDraftKey]);

  useEffect(() => {
    if (
      draftState !== "ACTIVE" ||
      !draftDirty ||
      busy ||
      receiptScanning
    ) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        writeDraft<ExpenseDraft>(
          expenseDraftKey,
          {
            countryId,
            expenseDate,
            category,
            currency,
            rate,
            rateType,
            amount,
            actualConvertedAmount,
            splitMode,
            splitUserIds,
            splitValues,
            paidByUserId,
            description,
            receiptUrl:
              receiptUrl.startsWith(
                "data:image/",
              )
                ? "__KEEP_EXISTING_RECEIPT__"
                : receiptUrl,
            paymentMethod,
            notes,
          },
        );
      },
      350,
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    actualConvertedAmount,
    amount,
    busy,
    category,
    countryId,
    currency,
    description,
    draftDirty,
    draftState,
    expenseDate,
    expenseDraftKey,
    notes,
    paidByUserId,
    paymentMethod,
    rate,
    rateType,
    receiptScanning,
    receiptUrl,
    splitMode,
    splitUserIds,
    splitValues,
  ]);

  async function restoreExpenseDraft() {
    const stored =
      readDraft<ExpenseDraft>(
        expenseDraftKey,
      );

    if (!stored) {
      setDraftState("ACTIVE");
      return;
    }

    const draft = stored.data;
    const countryChanged =
      draft.countryId !== countryId;

    if (countryChanged && !initial) {
      const switched =
        await handleTripChange(
          draft.countryId,
        );

      if (!switched) {
        return;
      }
    }

    if (countryChanged) {
      preserveMembersRef.current =
        true;
    }

    setCountryId(draft.countryId);
    setExpenseDate(
      draft.expenseDate,
    );
    setCategory(draft.category);
    setCurrency(draft.currency);
    setRate(draft.rate);
    setRateType(draft.rateType);
    setAmount(draft.amount);
    setActualConvertedAmount(
      draft.actualConvertedAmount,
    );
    setSplitMode(
      draft.splitMode,
    );
    setSplitUserIds(
      draft.splitUserIds,
    );
    setSplitValues(
      draft.splitValues,
    );
    setPaidByUserId(
      draft.paidByUserId,
    );
    setDescription(
      draft.description,
    );
    setReceiptUrl(
      draft.receiptUrl ===
        "__KEEP_EXISTING_RECEIPT__"
        ? initial?.receiptUrl ??
            receiptUrl
        : draft.receiptUrl,
    );
    setPaymentMethod(
      draft.paymentMethod,
    );
    setNotes(draft.notes);
    setDraftDirty(true);
    setDraftState("ACTIVE");

    if (!countryChanged) {
      preserveMembersRef.current =
        false;
    }
  }

  function discardExpenseDraft() {
    clearDraft(
      expenseDraftKey,
    );
    setDraftSavedAt(null);
    setDraftDirty(false);
    setDraftState("ACTIVE");
  }

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

      if (preserveMembersRef.current) {
        preserveMembersRef.current =
          false;
        return;
      }

      if (!initial || countryId !== initial.countryId) {
        const loggedInUserIsAvailable = payload.members.some(
          (member) => member.id === currentUserId,
        );
        const defaultUserId = loggedInUserIsAvailable
          ? currentUserId
          : payload.members[0]?.id ?? "";
        const defaultSplitIds = defaultUserId
          ? [defaultUserId]
          : [];

        setSplitUserIds(defaultSplitIds);
        setSplitValues(
          splitMode === "PERCENTAGE"
            ? equalPercentages(defaultSplitIds)
            : {},
        );
        setPaidByUserId(defaultUserId);
      }
    }

    loadMembers().catch(() => undefined);
    return () => controller.abort();
  }, [countryId, initial]);

  async function handleCurrencyChange(
    nextCurrency: string,
  ): Promise<void> {
    const normalized = nextCurrency
      .trim()
      .toUpperCase()
      .slice(0, 3);

    if (!/^[A-Z]{3}$/.test(normalized)) {
      return;
    }

    const requestId = fxRequestIdRef.current + 1;
    fxRequestIdRef.current = requestId;

    setCurrency(normalized);
    setFxRateMessage("");
    setActualConvertedAmount("");

    if (!currentCountry) {
      return;
    }

    const baseCurrency =
      currentCountry.baseCurrency.toUpperCase();
    const tripCurrency =
      currentCountry.currencyCode.toUpperCase();

    if (sameCurrency(normalized, baseCurrency)) {
      setRate("1");
      setRateType("DEFAULT");
      setFxRateLoading(false);
      setFxRateMessage(
        `${normalized} is the trip base currency, so the rate is 1:1.`,
      );
      return;
    }

    if (sameCurrency(normalized, tripCurrency)) {
      setRate(currentCountry.defaultExchangeRate);
      setRateType("DEFAULT");
      setFxRateLoading(false);
      setFxRateMessage(
        `Using the saved trip default for ${normalized}.`,
      );
      return;
    }

    setRate("");
    setRateType("DEFAULT");

    if (!navigator.onLine) {
      setRateType("MANUAL");
      setFxRateLoading(false);
      setFxRateMessage(
        `Offline: enter the ${normalized} → ${baseCurrency} rate manually.`,
      );
      return;
    }

    setFxRateLoading(true);
    setFxRateMessage(
      `Loading today's ${normalized} → ${baseCurrency} reference rate…`,
    );

    try {
      const response = await fetch(
        `/api/fx?base=${encodeURIComponent(
          normalized,
        )}&quote=${encodeURIComponent(baseCurrency)}`,
        {
          cache: "no-store",
        },
      );

      const payload =
        (await response.json().catch(() => ({}))) as {
          rate?: number;
          rateDate?: string;
          provider?: string;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Unable to load the reference FX rate.",
        );
      }

      const nextRate = Number(payload.rate);

      if (!Number.isFinite(nextRate) || nextRate <= 0) {
        throw new Error("The FX service returned an invalid rate.");
      }

      if (fxRequestIdRef.current !== requestId) {
        return;
      }

      setRate(
        nextRate
          .toFixed(10)
          .replace(/0+$/, "")
          .replace(/\.$/, ""),
      );
      setRateType("DEFAULT");
      setFxRateMessage(
        `Daily reference${payload.rateDate ? ` · ${payload.rateDate}` : ""}${
          payload.provider ? ` · ${payload.provider}` : ""
        }. You can still choose Cash, Card or Manual below.`,
      );
    } catch {
      if (fxRequestIdRef.current !== requestId) {
        return;
      }

      setRateType("MANUAL");
      setFxRateMessage(
        `Reference rate unavailable. Enter the ${normalized} → ${baseCurrency} rate manually.`,
      );
    } finally {
      if (fxRequestIdRef.current === requestId) {
        setFxRateLoading(false);
      }
    }
  }

  function applyTripCountry(nextId: string) {
    fxRequestIdRef.current += 1;
    setCountryId(nextId);
    const country = countries.find((item) => item.id === nextId);

    if (country) {
      const nextCurrency = country.currencyCode.toUpperCase();
      const nextRate = sameCurrency(
        nextCurrency,
        country.baseCurrency,
      )
        ? "1"
        : country.defaultExchangeRate;

      setCurrency(nextCurrency);
      setRate(nextRate);
      setRateType("DEFAULT");
      setActualConvertedAmount("");
      setFxRateLoading(false);
      setFxRateMessage("");
      setReceiptResult(null);
      setReceiptMessage("");
      setReceiptScanStatus("");
      setReceiptScanProgress(0);
    }
  }

  async function handleTripChange(nextId: string): Promise<boolean> {
    if (nextId === countryId) {
      return true;
    }

    const country = countries.find((item) => item.id === nextId);

    if (!country) {
      return false;
    }

    if (initial) {
      applyTripCountry(nextId);
      return true;
    }

    if (!navigator.onLine) {
      window.location.assign("/offline.html");
      return false;
    }

    const previousId = countryId;
    setError("");
    setTripSwitching(true);

    try {
      const response = await fetch("/api/active-trip", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tripId: country.tripId,
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

      applyTripCountry(nextId);
      return true;
    } catch (caught) {
      setCountryId(previousId);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to switch trip.",
      );
      return false;
    } finally {
      setTripSwitching(false);
    }
  }

  function handleRateType(nextType: RateType) {
    if (isBaseCurrency) {
      setRateType("DEFAULT");
      setRate("1");
      setActualConvertedAmount("");
      return;
    }

    setRateType(nextType);

    if (nextType === "DEFAULT" && currentCountry) {
      if (
        sameCurrency(
          currency,
          currentCountry.currencyCode,
        )
      ) {
        setRate(currentCountry.defaultExchangeRate);
        setActualConvertedAmount("");
        setFxRateMessage(
          `Using the saved trip default for ${currency}.`,
        );
      } else {
        void handleCurrencyChange(currency);
      }
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
    setReceiptScanStatus("Preparing receipt");
    setReceiptScanProgress(0);
    setReceiptMessage("");
    setReceiptResult(null);
    setError("");

    try {
      const { recognizeReceiptLocally } = await import(
        "@/lib/receipt-ocr-client"
      );

      const detected = await recognizeReceiptLocally(
        file,
        currency,
        ({ status, progress }) => {
          setReceiptScanStatus(status);
          setReceiptScanProgress(progress);
        },
      );

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
        void handleCurrencyChange(detected.currencyCode);
      }

      if (!detected.merchantName && detected.totalAmount === null) {
        setReceiptMessage(
          "The receipt text was read, but the shop or final total is still uncertain. Try one of the suggestions below or enter it manually.",
        );
      } else if (detected.confidence === "LOW") {
        setReceiptMessage(
          "Receipt read with low confidence — please verify the shop name and amount.",
        );
      } else {
        setReceiptMessage(
          "Receipt read locally. Please verify the detected fields before saving.",
        );
      }
    } catch (caught) {
      setReceiptMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to read this receipt on this device.",
      );
    } finally {
      setReceiptScanning(false);
      setReceiptScanProgress(1);
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
    setReceiptScanStatus("");
    setReceiptScanProgress(0);
  }

  async function prepareReceiptForSave(
    file: File,
  ): Promise<string> {
    const { compressReceiptForDatabase } = await import(
      "@/lib/receipt-image-storage"
    );

    return compressReceiptForDatabase(file);
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
    let finalReceiptUrl = receiptUrl.trim();

    try {
      if (receiptFile) {
        finalReceiptUrl =
          await prepareReceiptForSave(receiptFile);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to prepare the receipt photo.",
      );
      setBusy(false);
      return;
    }

    const body = {
      countryId,
      expenseDate,
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
      paymentMethod,
      receiptUrl: finalReceiptUrl,
      notes,
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

      clearDraft(
        expenseDraftKey,
      );
      window.location.assign("/expenses");
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
      {tripSwitching ? (
        <SavingOverlay
          title="Switching trip"
          message="Updating this expense to the selected trip."
        />
      ) : receiptScanning ? (
        <SavingOverlay
          title="Reading your receipt"
          message="Finding the shop name and final amount on this device."
        />
      ) : busy ? (
        <SavingOverlay
          title={initial ? "Saving expense changes" : "Saving your expense"}
          message={
            receiptFile
              ? "Storing the receipt, totals and traveler shares."
              : "Updating totals and traveler shares."
          }
        />
      ) : null}
      <form
        className="expense-editor"
        onSubmit={submit}
        onInput={() =>
          setDraftDirty(true)
        }
        onChange={() =>
          setDraftDirty(true)
        }
        onClickCapture={() =>
          setDraftDirty(true)
        }
      >
        {draftState === "PENDING" ? (
          <div className="draft-recovery-banner expense-draft">
            <div>
              <strong>
                Unsaved expense found
              </strong>
              <small>
                {draftSavedAt
                  ? `Saved ${new Date(
                      draftSavedAt,
                    ).toLocaleString(
                      "en-MY",
                    )}`
                  : "A previous unfinished expense is available."}
                {" "}Receipt photos must be reattached if they were not saved yet.
              </small>
            </div>

            <div>
              <button
                className="button primary"
                type="button"
                onClick={() =>
                  void restoreExpenseDraft()
                }
              >
                Restore draft
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={
                  discardExpenseDraft
                }
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}

        <header className="expense-editor-hero">
          <div className="expense-editor-title">
            <p className="eyebrow">MILES &amp; MEALS · EXPENSES</p>
            <h1>{initial ? "Edit expense" : "Add a spend"}</h1>
            <p className="muted">
              {initial
                ? "Update the spend, exchange rate and sharing details."
                : "Record it quickly, split it fairly, keep the trip moving."}
            </p>
          </div>

          <label
            className={
              receiptScanning
                ? "expense-scan-action scanning"
                : "expense-scan-action"
            }
          >
            <input
              className="receipt-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleReceiptFile}
              disabled={receiptScanning || busy}
            />
            {receiptScanning ? (
              <span className="mini-spinner" />
            ) : (
              <span className="expense-scan-icon">📷</span>
            )}
            <span>
              <strong>
                {receiptScanning
                  ? "Reading receipt…"
                  : receiptFile
                    ? "Scan another"
                    : "Scan receipt"}
              </strong>
            </span>
          </label>
        </header>

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
            Trip
            <select
              aria-label="Choose expense trip"
              value={countryId}
              disabled={tripSwitching || busy || Boolean(initial)}
              onChange={(event) =>
                void handleTripChange(event.target.value)
              }
            >
              {countries.map((country) => (
                <option value={country.id} key={country.id}>
                  {country.tripName}
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
              value={expenseDate}
              onChange={(event) =>
                setExpenseDate(
                  event.target.value,
                )
              }
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
            <select
              value={currency}
              onChange={(event) =>
                void handleCurrencyChange(event.target.value)
              }
              required
              aria-label="Transaction currency"
              disabled={busy || fxRateLoading}
            >
              {currencyOptions.map((option) => (
                <option value={option.code} key={option.code}>
                  {option.code} · {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="amount-control">
            Amount
            <input
              inputMode="decimal"
              data-numeric-input="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              placeholder="0.00"
              aria-label="Transaction amount"
            />
          </label>
        </div>

        {fxRateLoading || fxRateMessage ? (
          <div
            className={
              fxRateLoading
                ? "expense-fx-helper loading"
                : "expense-fx-helper"
            }
            role="status"
          >
            {fxRateLoading ? (
              <span className="mini-spinner" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">↔</span>
            )}
            <small>{fxRateMessage}</small>
          </div>
        ) : null}
      </section>

      <section className="expense-section fx-section">
        <div className="section-heading">
          <span className="section-number amber">2</span>
          <div>
            <h2>Exchange rate</h2>
            {!isBaseCurrency ? (
              <p>
                Use the actual cash or card rate for accurate trip totals.
              </p>
            ) : null}
          </div>
        </div>

        <div className="segmented-control" role="group" aria-label="Exchange rate source">
          {rateTypes.map((item) => (
            <button
              className={rateType === item.value ? "segment active" : "segment"}
              key={item.value}
              onClick={() => handleRateType(item.value)}
              type="button"
              disabled={isBaseCurrency}
              aria-disabled={isBaseCurrency}
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
              data-numeric-input="decimal"
              value={isBaseCurrency ? "1" : rate}
              onChange={(event) => {
                if (!isBaseCurrency) {
                  setRate(event.target.value);
                }
              }}
              readOnly={isBaseCurrency}
              className={isBaseCurrency ? "fx-rate-locked" : undefined}
              required
            />
          </label>
          <div className="fx-currency">
            {currentCountry?.baseCurrency ?? "MYR"}
          </div>
          {isBaseCurrency ? (
            <span className="base-currency-badge">1:1 Base currency</span>
          ) : null}
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

        {rateType === "CREDIT_CARD" && !isBaseCurrency ? (
          <label className="actual-charge">
            Actual card charge in {currentCountry?.baseCurrency ?? "MYR"}
            <input
              inputMode="decimal"
              data-numeric-input="decimal"
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
              data-numeric-input="decimal"
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

      {(receiptFile ||
        receiptPreviewUrl ||
        receiptScanning ||
        receiptMessage ||
        initial?.receiptUrl) ? (
        <section className="receipt-inline-panel">
          <div className="receipt-inline-heading">
            <div>
              <strong>Receipt scan</strong>
              <small>
                Detected values stay editable before you save.
              </small>
            </div>
          </div>

          <div className="receipt-scanner">
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
              <div className="receipt-ocr-progress-copy">
                <strong>{receiptScanStatus || "Reading receipt…"}</strong>
                <small>
                  {Math.round(receiptScanProgress * 100)}% · First scan can
                  take longer while the OCR engine downloads.
                </small>
                <span className="receipt-ocr-progress-track">
                  <span
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round(receiptScanProgress * 100),
                      )}%`,
                    }}
                  />
                </span>
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
                  {receiptResult ? "Receipt read" : "Could not auto-fill"}
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
                <small>
                  Shop confidence
                </small>
                <strong
                  className={`receipt-confidence ${receiptResult.merchantConfidence.toLowerCase()}`}
                >
                  {
                    receiptResult.merchantConfidence
                  }
                </strong>
              </div>
              <div>
                <small>
                  Total confidence
                </small>
                <strong
                  className={`receipt-confidence ${receiptResult.totalConfidence.toLowerCase()}`}
                >
                  {
                    receiptResult.totalConfidence
                  }
                </strong>
              </div>
              <div>
                <small>
                  Overall OCR
                </small>
                <strong
                  className={`receipt-confidence ${receiptResult.confidence.toLowerCase()}`}
                >
                  {
                    receiptResult.confidence
                  }
                </strong>
              </div>
            </div>
          ) : null}

          {receiptResult?.merchantCandidates &&
          receiptResult.merchantCandidates.length > 1 ? (
            <div className="receipt-shop-suggestions">
              <small>Shop suggestions</small>
              <div>
                {receiptResult.merchantCandidates.map((candidate) => (
                  <button
                    className={
                      description === candidate
                        ? "receipt-shop-chip active"
                        : "receipt-shop-chip"
                    }
                    key={candidate}
                    type="button"
                    onClick={() => setDescription(candidate)}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {receiptResult?.totalCandidates &&
          receiptResult.totalCandidates.length > 1 ? (
            <div className="receipt-shop-suggestions">
              <small>Total suggestions</small>
              <div>
                {receiptResult.totalCandidates.map((candidate) => {
                  const candidateValue = candidate
                    .toFixed(2)
                    .replace(/\.00$/, "");

                  return (
                    <button
                      className={
                        amount === candidateValue
                          ? "receipt-shop-chip active"
                          : "receipt-shop-chip"
                      }
                      key={candidate.toFixed(2)}
                      type="button"
                      onClick={() => setAmount(candidateValue)}
                    >
                      {receiptResult.currencyCode ?? currency}{" "}
                      {candidate.toLocaleString("en-MY", {
                        maximumFractionDigits: 2,
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {receiptResult?.rawText ? (
            <details className="receipt-ocr-text">
              <summary>View detected receipt text</summary>
              <pre>{receiptResult.rawText}</pre>
            </details>
          ) : null}

        </div>
        </section>
      ) : null}

      <section className="expense-section details-section">
        <div className="section-heading">
          <span className="section-number">4</span>
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
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value,
                )
              }
              placeholder="Maybank Visa / Cash / Wise"
            />
          </label>

          <label>
            Receipt / link
            <input
              name="receiptUrl"
              type="url"
              value={
                receiptUrl.startsWith("data:image/")
                  ? ""
                  : receiptUrl
              }
              onChange={(event) =>
                setReceiptUrl(event.target.value)
              }
              placeholder={
                receiptUrl.startsWith("data:image/")
                  ? "Receipt photo stored with expense"
                  : "Optional external receipt URL"
              }
            />
          </label>
        </div>

        <label>
          Notes
          <textarea
            name="notes"
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
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
