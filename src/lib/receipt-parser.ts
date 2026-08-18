export type ReceiptConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ParsedReceipt = {
  merchantName: string | null;
  totalAmount: number | null;
  currencyCode: string | null;
  confidence: ReceiptConfidence;
  rawText: string;
};

type AmountCandidate = {
  amount: number;
  score: number;
};

const TOTAL_KEYWORDS: Array<[RegExp, number]> = [
  [/\bGRAND\s+TOTAL\b/, 120],
  [/\bTOTAL\s+DUE\b/, 115],
  [/\bAMOUNT\s+DUE\b/, 115],
  [/\bAMOUNT\s+PAYABLE\b/, 112],
  [/\bTOTAL\s+AMOUNT\b/, 110],
  [/\bNET\s+TOTAL\b/, 108],
  [/\bNET\s+AMOUNT\b/, 106],
  [/\bTHANH\s+TIEN\b/, 108],
  [/\bTONG\s+CONG\b/, 108],
  [/\bTONG\s+TIEN\b/, 106],
  [/\bTONG\b/, 96],
  [/\bTOTAL\b/, 100],
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
];

const MERCHANT_NOISE = [
  /\bRECEIPT\b/,
  /\bTAX\s+INVOICE\b/,
  /\bINVOICE\b/,
  /\bTEL(?:EPHONE)?\b/,
  /\bPHONE\b/,
  /\bADDRESS\b/,
  /\bDATE\b/,
  /\bTIME\b/,
  /\bCASHIER\b/,
  /\bSERVER\b/,
  /\bTABLE\b/,
  /\bORDER\b/,
  /\bTHANK\b/,
  /\bWELCOME\b/,
  /\bWWW\b/,
  /\bHTTP\b/,
  /\bTOTAL\b/,
  /\bSUBTOTAL\b/,
  /\bGST\b/,
  /\bVAT\b/,
  /\bQTY\b/,
  /\bQUANTITY\b/,
  /\bPRICE\b/,
  /\bAMOUNT\b/,
  /\bCHANGE\b/,
  /\bCASH\b/,
  /\bCARD\b/,
  /\bPAYMENT\b/,
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
    const decimals = value.length - value.lastIndexOf(decimalSeparator) - 1;

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
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000_000
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

  if (NEGATIVE_TOTAL_KEYWORDS.some((pattern) => pattern.test(normalizedLine))) {
    score -= 90;
  }

  const positionRatio = lineCount > 1 ? index / (lineCount - 1) : 0;
  return score + Math.round(positionRatio * 15);
}

function findTotal(lines: string[]): AmountCandidate | null {
  const candidates: AmountCandidate[] = [];

  lines.forEach((line, index) => {
    const normalized = normalizeSearchText(line);
    const score = lineTotalScore(normalized, index, lines.length);
    if (score <= 0) return;

    for (const amount of extractNumbers(line)) {
      candidates.push({ amount, score });
    }
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
    return candidates[0];
  }

  const bottomStart = Math.max(0, Math.floor(lines.length * 0.65));
  for (let index = bottomStart; index < lines.length; index += 1) {
    const line = lines[index];
    const hasCurrency = CURRENCY_RULES.some(([, rule]) => rule.test(line));
    if (!hasCurrency) continue;

    for (const amount of extractNumbers(line)) {
      candidates.push({ amount, score: 35 + index });
    }
  }

  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  return candidates[0] ?? null;
}

function merchantScore(line: string, index: number): number {
  const normalized = normalizeSearchText(line);

  if (
    line.length < 2 ||
    line.length > 80 ||
    MERCHANT_NOISE.some((pattern) => pattern.test(normalized))
  ) {
    return -1000;
  }

  const letters = (line.match(/[A-Za-zÀ-ỹ]/g) ?? []).length;
  const digits = (line.match(/\d/g) ?? []).length;

  if (letters < 2 || digits > Math.max(4, letters)) {
    return -1000;
  }

  let score = 70 - index * 4;
  if (index <= 4) score += 25;
  if (letters >= 5) score += 8;
  if (/^[A-Z0-9 &'’.\-]+$/.test(line) && letters >= 3) score += 10;
  if (/\b(STREET|ROAD|DISTRICT|WARD|CITY|MALL|FLOOR|LEVEL)\b/i.test(line)) {
    score -= 20;
  }
  if (/@|\.COM\b|\.VN\b|\.MY\b/i.test(line)) score -= 25;

  return score;
}

function findMerchant(lines: string[]): string | null {
  const candidates = lines
    .slice(0, Math.min(lines.length, 18))
    .map((line, index) => ({ line, score: merchantScore(line, index) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.line ?? null;
}

function detectCurrency(
  text: string,
  fallbackCurrency: string | null,
): string | null {
  for (const [currency, rule] of CURRENCY_RULES) {
    if (rule.test(text)) return currency;
  }

  const fallback = fallbackCurrency?.trim().toUpperCase();
  return fallback && /^[A-Z]{3}$/.test(fallback) ? fallback : null;
}

function receiptConfidence(
  merchant: string | null,
  total: AmountCandidate | null,
  ocrConfidence: number,
): ReceiptConfidence {
  let score = 0;
  if (merchant) score += 1;
  if (total && total.score >= 90) score += 2;
  else if (total) score += 1;
  if (ocrConfidence >= 70) score += 1;

  if (score >= 4) return "HIGH";
  if (score >= 2) return "MEDIUM";
  return "LOW";
}

export function parseReceiptText(
  rawText: string,
  fallbackCurrency: string | null,
  ocrConfidence = 0,
): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const merchantName = findMerchant(lines);
  const total = findTotal(lines);

  return {
    merchantName,
    totalAmount: total?.amount ?? null,
    currencyCode: detectCurrency(rawText, fallbackCurrency),
    confidence: receiptConfidence(merchantName, total, ocrConfidence),
    rawText,
  };
}
