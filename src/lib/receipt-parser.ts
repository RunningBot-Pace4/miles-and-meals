export type ReceiptConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ParsedReceipt = {
  merchantName: string | null;
  merchantCandidates: string[];
  totalAmount: number | null;
  currencyCode: string | null;
  confidence: ReceiptConfidence;
  rawText: string;
};

type AmountCandidate = {
  amount: number;
  score: number;
};

type MerchantCandidate = {
  value: string;
  score: number;
};

const TOTAL_KEYWORDS: Array<[RegExp, number]> = [
  [/\bGRAND\s+TOTAL\b/, 125],
  [/\bTOTAL\s+DUE\b/, 120],
  [/\bAMOUNT\s+DUE\b/, 120],
  [/\bAMOUNT\s+PAYABLE\b/, 118],
  [/\bTOTAL\s+AMOUNT\b/, 116],
  [/\bNET\s+TOTAL\b/, 112],
  [/\bNET\s+AMOUNT\b/, 110],
  [/\bTHANH\s+TIEN\b/, 112],
  [/\bTONG\s+CONG\b/, 112],
  [/\bTONG\s+TIEN\b/, 110],
  [/\bTONG\b/, 100],
  [/\bTOTAL\b/, 104],
];

const NEGATIVE_TOTAL_KEYWORDS = [
  /\bSUB\s*TOTAL\b/,
  /\bSUBTOTAL\b/,
  /\bDISCOUNT\b/,
  /\bCHANGE\b/,
  /\bCASH\s+TENDERED\b/,
  /\bCASH\s+RECEIVED\b/,
  /\bAMOUNT\s+RECEIVED\b/,
  /\bVAT\b/,
  /\bTAX\b/,
  /\bSERVICE\s+CHARGE\b/,
  /\bROUNDING\b/,
  /\bBALANCE\b/,
];

const STRONG_MERCHANT_WORDS = [
  /\bCAFE\b/,
  /\bCOFFEE\b/,
  /\bRESTAURANT\b/,
  /\bKITCHEN\b/,
  /\bBISTRO\b/,
  /\bBAKERY\b/,
  /\bMART\b/,
  /\bMARKET\b/,
  /\bSTORE\b/,
  /\bSHOP\b/,
  /\bHOTEL\b/,
  /\bHOSTEL\b/,
  /\bPHARMACY\b/,
  /\bPHARMAC(?:Y|IE)\b/,
  /\bTRADING\b/,
  /\bFOOD\b/,
  /\bGRILL\b/,
  /\bBAR\b/,
  /\bHOUSE\b/,
  /\bMALL\b/,
  /\bSUPERMARKET\b/,
  /\bMINIMART\b/,
  /\bCONVENIENCE\b/,
  /\bSPA\b/,
  /\bSALON\b/,
  /\bBOUTIQUE\b/,
  /\bSDN\.?\s*BHD\.?\b/,
  /\bPTE\.?\s*LTD\.?\b/,
  /\bCO\.?\s*LTD\.?\b/,
  /\bLIMITED\b/,
];

const MERCHANT_NOISE = [
  /\bRECEIPT\b/,
  /\bTAX\s+INVOICE\b/,
  /\bINVOICE\b/,
  /\bINVOICE\s+NO\b/,
  /\bTEL(?:EPHONE)?\b/,
  /\bPHONE\b/,
  /\bADDRESS\b/,
  /\bDATE\b/,
  /\bTIME\b/,
  /\bCASHIER\b/,
  /\bSERVER\b/,
  /\bTABLE\b/,
  /\bORDER\b/,
  /\bBILL\b/,
  /\bTHANK\b/,
  /\bWELCOME\b/,
  /\bWWW\b/,
  /\bHTTP\b/,
  /\bTOTAL\b/,
  /\bSUBTOTAL\b/,
  /\bGST\b/,
  /\bVAT\b/,
  /\bTAX\b/,
  /\bQTY\b/,
  /\bQUANTITY\b/,
  /\bUNIT\s+PRICE\b/,
  /\bPRICE\b/,
  /\bAMOUNT\b/,
  /\bCHANGE\b/,
  /\bCASH\b/,
  /\bCARD\b/,
  /\bPAYMENT\b/,
  /\bAPPROVAL\b/,
  /\bAUTH(?:ORIZATION)?\b/,
  /\bTERMINAL\b/,
  /\bMERCHANT\s+ID\b/,
  /\bMID\b/,
  /\bTID\b/,
  /\bROC\b/,
  /\bREG(?:ISTRATION)?\s+NO\b/,
  /\bCOMPANY\s+NO\b/,
];

const ADDRESS_NOISE = [
  /\bSTREET\b/,
  /\bST\.?\b/,
  /\bROAD\b/,
  /\bRD\.?\b/,
  /\bAVENUE\b/,
  /\bAVE\.?\b/,
  /\bJALAN\b/,
  /\bLORONG\b/,
  /\bDISTRICT\b/,
  /\bWARD\b/,
  /\bCITY\b/,
  /\bFLOOR\b/,
  /\bLEVEL\b/,
  /\bUNIT\b/,
  /\bLOT\b/,
  /\bNO\.?\s*\d+/,
  /\bPOSTCODE\b/,
  /\bZIP\b/,
];

const CURRENCY_RULES: Array<[string, RegExp]> = [
  ["VND", /\bVND\b|₫|\bDONG\b/i],
  ["MYR", /\bMYR\b|\bRM\b/i],
  ["SGD", /\bSGD\b|S\$/i],
  ["USD", /\bUSD\b|US\$/i],
  ["THB", /\bTHB\b|฿/i],
  ["JPY", /\bJPY\b|￥|¥/i],
  ["KRW", /\bKRW\b|₩/i],
  ["CNY", /\bCNY\b|\bRMB\b/i],
  ["EUR", /\bEUR\b|€/i],
  ["GBP", /\bGBP\b|£/i],
  ["IDR", /\bIDR\b|\bRP\b/i],
  ["PHP", /\bPHP\b|₱/i],
  ["HKD", /\bHKD\b|HK\$/i],
  ["TWD", /\bTWD\b|NT\$/i],
];

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cleanLine(value: string): string {
  return value
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/^[\s\-_=*~:;,.]+|[\s\-_=*~:;,.]+$/g, "")
    .trim();
}

function cleanMerchant(value: string): string {
  return cleanLine(value)
    .replace(/^[^\p{L}\p{N}]+/gu, "")
    .replace(/[^\p{L}\p{N}&'’().,+\- ]+$/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseLocaleAmount(token: string): number | null {
  let value = token
    .replace(/[^\d.,\s]/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!value || !/\d/.test(value)) {
    return null;
  }

  const commaCount = (value.match(/,/g) ?? []).length;
  const dotCount = (value.match(/\./g) ?? []).length;
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (commaCount > 0 && dotCount > 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const decimals =
      value.length - value.lastIndexOf(decimalSeparator) - 1;

    value = value.split(thousandsSeparator).join("");

    if (decimals === 2) {
      value =
        decimalSeparator === ","
          ? value.replace(",", ".")
          : value;
    } else {
      value = value.split(decimalSeparator).join("");
    }
  } else if (commaCount > 0 || dotCount > 0) {
    const separator = commaCount > 0 ? "," : ".";
    const parts = value.split(separator);
    const trailingLength = parts.at(-1)?.length ?? 0;
    const looksLikeThousands =
      trailingLength === 3 &&
      parts.length >= 2 &&
      parts.slice(1).every((part) => part.length === 3);

    if (looksLikeThousands) {
      value = parts.join("");
    } else if (parts.length === 2 && trailingLength === 2) {
      value = `${parts[0]}.${parts[1]}`;
    } else if (
      parts.length > 2 &&
      trailingLength === 2 &&
      parts.slice(1, -1).every((part) => part.length === 3)
    ) {
      value = `${parts.slice(0, -1).join("")}.${parts.at(-1)}`;
    } else {
      value = parts.join("");
    }
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed > 0 &&
    parsed <= 1_000_000_000
    ? parsed
    : null;
}

function extractNumbers(line: string): number[] {
  const tokens =
    line.match(
      /\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{1,2})?/g,
    ) ?? [];

  return tokens
    .map(parseLocaleAmount)
    .filter((value): value is number => value !== null);
}

function lineTotalScore(
  normalizedLine: string,
  index: number,
  lineCount: number,
): number {
  let score = 0;

  for (const [keyword, weight] of TOTAL_KEYWORDS) {
    if (keyword.test(normalizedLine)) {
      score = Math.max(score, weight);
    }
  }

  if (score === 0) {
    return 0;
  }

  if (
    NEGATIVE_TOTAL_KEYWORDS.some((pattern) =>
      pattern.test(normalizedLine),
    )
  ) {
    score -= 95;
  }

  const positionRatio =
    lineCount > 1 ? index / (lineCount - 1) : 0;

  return score + Math.round(positionRatio * 15);
}

function findTotal(lines: string[]): AmountCandidate | null {
  const candidates: AmountCandidate[] = [];

  lines.forEach((line, index) => {
    const normalized = normalizeSearchText(line);
    const score = lineTotalScore(
      normalized,
      index,
      lines.length,
    );

    if (score <= 0) {
      return;
    }

    for (const amount of extractNumbers(line)) {
      candidates.push({ amount, score });
    }
  });

  if (candidates.length > 0) {
    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        b.amount - a.amount,
    );

    return candidates[0];
  }

  const bottomStart = Math.max(
    0,
    Math.floor(lines.length * 0.65),
  );

  for (
    let index = bottomStart;
    index < lines.length;
    index += 1
  ) {
    const line = lines[index];
    const hasCurrency = CURRENCY_RULES.some(
      ([, rule]) => rule.test(line),
    );

    if (!hasCurrency) {
      continue;
    }

    for (const amount of extractNumbers(line)) {
      candidates.push({
        amount,
        score: 35 + index,
      });
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.amount - a.amount,
  );

  return candidates[0] ?? null;
}

function merchantScore(
  line: string,
  index: number,
  source: "HEADER" | "FULL",
): number {
  const cleaned = cleanMerchant(line);
  const normalized = normalizeSearchText(cleaned);

  if (
    cleaned.length < 2 ||
    cleaned.length > 70 ||
    MERCHANT_NOISE.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    return -1000;
  }

  const letters =
    cleaned.match(/\p{L}/gu)?.length ?? 0;
  const digits =
    cleaned.match(/\d/g)?.length ?? 0;

  if (
    letters < 2 ||
    digits > Math.max(4, Math.floor(letters * 0.55))
  ) {
    return -1000;
  }

  let score = source === "HEADER" ? 115 : 72;

  score -= index * (source === "HEADER" ? 5 : 4);

  if (index <= 2) {
    score += 28;
  } else if (index <= 5) {
    score += 14;
  }

  if (letters >= 5) {
    score += 8;
  }

  if (
    STRONG_MERCHANT_WORDS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    score += 32;
  }

  const alphaCharacters = cleaned.replace(
    /[^\p{L}]/gu,
    "",
  );
  const uppercaseCharacters =
    alphaCharacters.match(/\p{Lu}/gu)?.length ?? 0;

  if (
    alphaCharacters.length >= 3 &&
    uppercaseCharacters / alphaCharacters.length >= 0.75
  ) {
    score += 18;
  }

  if (
    ADDRESS_NOISE.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    score -= 42;
  }

  if (
    /@|\.COM\b|\.VN\b|\.MY\b|\.SG\b/i.test(cleaned)
  ) {
    score -= 45;
  }

  if (
    /^\d/.test(cleaned) ||
    /\b\d{5,}\b/.test(cleaned)
  ) {
    score -= 38;
  }

  if (
    /^[A-Z]{1,3}\s*[:#-]?\s*\d+/i.test(cleaned)
  ) {
    score -= 30;
  }

  return score;
}

function collectMerchantCandidates(
  text: string,
  source: "HEADER" | "FULL",
): MerchantCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map(cleanMerchant)
    .filter(Boolean)
    .slice(0, source === "HEADER" ? 14 : 20);

  const candidates: MerchantCandidate[] =
    lines.map((line, index) => ({
      value: line,
      score: merchantScore(line, index, source),
    }));

  for (
    let index = 0;
    index < Math.min(lines.length - 1, 7);
    index += 1
  ) {
    const first = lines[index];
    const second = lines[index + 1];

    if (
      first.length > 28 ||
      second.length > 28
    ) {
      continue;
    }

    const combined = `${first} ${second}`;
    const normalized = normalizeSearchText(combined);
    const hasMerchantWord = STRONG_MERCHANT_WORDS.some(
      (pattern) => pattern.test(normalized),
    );

    if (!hasMerchantWord) {
      continue;
    }

    candidates.push({
      value: combined,
      score:
        merchantScore(first, index, source) +
        18,
    });
  }

  return candidates.filter(
    (candidate) => candidate.score > 0,
  );
}

function findMerchants(
  rawText: string,
  headerText: string,
): {
  merchantName: string | null;
  merchantCandidates: string[];
} {
  const all = [
    ...collectMerchantCandidates(
      headerText,
      "HEADER",
    ),
    ...collectMerchantCandidates(
      rawText,
      "FULL",
    ),
  ];

  const bestByValue = new Map<string, MerchantCandidate>();

  for (const candidate of all) {
    const key = normalizeSearchText(candidate.value);
    const existing = bestByValue.get(key);

    if (
      !existing ||
      candidate.score > existing.score
    ) {
      bestByValue.set(key, candidate);
    }
  }

  const ranked = [...bestByValue.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((candidate) => candidate.value);

  return {
    merchantName: ranked[0] ?? null,
    merchantCandidates: ranked,
  };
}

function detectCurrency(
  text: string,
  fallbackCurrency: string | null,
): string | null {
  for (const [currency, rule] of CURRENCY_RULES) {
    if (rule.test(text)) {
      return currency;
    }
  }

  const fallback =
    fallbackCurrency?.trim().toUpperCase();

  return fallback &&
    /^[A-Z]{3}$/.test(fallback)
    ? fallback
    : null;
}

function receiptConfidence(
  merchant: string | null,
  total: AmountCandidate | null,
  ocrConfidence: number,
): ReceiptConfidence {
  let score = 0;

  if (merchant) {
    score += 1;
  }

  if (total && total.score >= 95) {
    score += 2;
  } else if (total) {
    score += 1;
  }

  if (ocrConfidence >= 70) {
    score += 1;
  }

  if (score >= 4) {
    return "HIGH";
  }

  if (score >= 2) {
    return "MEDIUM";
  }

  return "LOW";
}

export function parseReceiptText(
  rawText: string,
  fallbackCurrency: string | null,
  ocrConfidence = 0,
  headerText = "",
): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const merchants = findMerchants(
    rawText,
    headerText || rawText,
  );
  const total = findTotal(lines);

  return {
    merchantName: merchants.merchantName,
    merchantCandidates:
      merchants.merchantCandidates,
    totalAmount: total?.amount ?? null,
    currencyCode: detectCurrency(
      `${headerText}\n${rawText}`,
      fallbackCurrency,
    ),
    confidence: receiptConfidence(
      merchants.merchantName,
      total,
      ocrConfidence,
    ),
    rawText,
  };
}
