export type ReceiptConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ParsedReceipt = {
  merchantName: string | null;
  merchantCandidates: string[];
  totalAmount: number | null;
  totalCandidates: number[];
  currencyCode: string | null;
  confidence: ReceiptConfidence;
  merchantConfidence: ReceiptConfidence;
  totalConfidence: ReceiptConfidence;
  rawText: string;
};

type AmountCandidate = {
  amount: number;
  score: number;
  source: "FULL" | "ALT_FULL" | "BOTTOM";
};

type MerchantCandidate = {
  value: string;
  score: number;
  source: "HEADER" | "FULL" | "ALT_FULL";
};

const TOTAL_KEYWORDS: Array<[RegExp, number]> = [
  [/\bGRAND\s+TOTAL\b/, 145],
  [/\bTOTAL\s+DUE\b/, 140],
  [/\bAMOUNT\s+DUE\b/, 140],
  [/\bAMOUNT\s+PAYABLE\b/, 136],
  [/\bTOTAL\s+AMOUNT\b/, 134],
  [/\bNET\s+TOTAL\b/, 130],
  [/\bNET\s+AMOUNT\b/, 128],
  [/\bTHANH\s+TIEN\b/, 134],
  [/\bTONG\s+CONG\b/, 134],
  [/\bTONG\s+TIEN\b/, 132],
  [/\bPHAI\s+THU\b/, 126],
  [/\bPAYABLE\b/, 122],
  [/\bBALANCE\s+DUE\b/, 120],
  [/\bTONG\b/, 114],
  [/\bTOTAL\b/, 120],
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
  /\bBALANCE\s+CHANGE\b/,
  /\bPOINTS?\b/,
  /\bLOYALTY\b/,
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
  /\bCOMPANY\b/,
  /\bENTERPRISE\b/,
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
  /\bITEM\b/,
  /\bDESCRIPTION\b/,
  /\bSERVICE\s+CHARGE\b/,
  /\bROUNDING\b/,
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

function normalizeTotalLabel(value: string): string {
  return normalizeSearchText(value)
    .replace(/0/g, "O")
    .replace(/[1|]/g, "I")
    .replace(/5/g, "S");
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

function normalizeNumericOcr(value: string): string {
  const characters = [...value];

  return characters
    .map((character, index) => {
      const previous = characters[index - 1] ?? "";
      const next = characters[index + 1] ?? "";
      const numericNeighbor =
        /[\d.,]/.test(previous) ||
        /[\d.,]/.test(next);

      if (!numericNeighbor) {
        return character;
      }

      if (character === "O" || character === "o") {
        return "0";
      }

      if (
        character === "I" ||
        character === "l"
      ) {
        return "1";
      }

      if (character === "S") {
        return "5";
      }

      return character;
    })
    .join("");
}

function parseLocaleAmount(token: string): number | null {
  let value = normalizeNumericOcr(token)
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
  const normalized = normalizeNumericOcr(line);
  const tokens =
    normalized.match(
      /(?:\d|[OoIl]){1,3}(?:[.,\s](?:\d|[OoIl]){3})+(?:[.,](?:\d|[OoIl]){2})?|(?:\d|[OoIl])+(?:[.,](?:\d|[OoIl]){1,2})?/g,
    ) ?? [];

  return tokens
    .map(parseLocaleAmount)
    .filter((value): value is number => value !== null);
}

function lineTotalScore(
  line: string,
  index: number,
  lineCount: number,
  source: AmountCandidate["source"],
): number {
  const normalizedLine = normalizeTotalLabel(line);
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
    score -= 105;
  }

  const positionRatio =
    lineCount > 1 ? index / (lineCount - 1) : 0;

  score += Math.round(positionRatio * 18);

  if (source === "BOTTOM") {
    score += 28;
  } else if (source === "ALT_FULL") {
    score += 8;
  }

  return score;
}

function collectTotalCandidates(
  text: string,
  source: AmountCandidate["source"],
): AmountCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const candidates: AmountCandidate[] = [];

  lines.forEach((line, index) => {
    const score = lineTotalScore(
      line,
      index,
      lines.length,
      source,
    );

    if (score <= 0) {
      return;
    }

    const values = extractNumbers(line);

    values.forEach((amount, amountIndex) => {
      candidates.push({
        amount,
        score: score + amountIndex * 2,
        source,
      });
    });
  });

  if (candidates.length === 0 && source === "BOTTOM") {
    lines.forEach((line, index) => {
      const hasCurrency = CURRENCY_RULES.some(
        ([, rule]) => rule.test(line),
      );

      if (!hasCurrency) {
        return;
      }

      for (const amount of extractNumbers(line)) {
        candidates.push({
          amount,
          score: 62 + index,
          source,
        });
      }
    });
  }

  return candidates;
}

function rankTotals(
  fullText: string,
  altFullText: string,
  bottomText: string,
): {
  total: AmountCandidate | null;
  values: number[];
} {
  const all = [
    ...collectTotalCandidates(fullText, "FULL"),
    ...collectTotalCandidates(altFullText, "ALT_FULL"),
    ...collectTotalCandidates(bottomText, "BOTTOM"),
  ];

  const grouped = new Map<
    string,
    { amount: number; score: number; appearances: number }
  >();

  for (const candidate of all) {
    const key = candidate.amount.toFixed(2);
    const existing = grouped.get(key);

    if (existing) {
      existing.score = Math.max(existing.score, candidate.score);
      existing.appearances += 1;
    } else {
      grouped.set(key, {
        amount: candidate.amount,
        score: candidate.score,
        appearances: 1,
      });
    }
  }

  const ranked = [...grouped.values()]
    .map((candidate) => ({
      ...candidate,
      score:
        candidate.score +
        Math.min(36, (candidate.appearances - 1) * 18),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.appearances - a.appearances ||
        b.amount - a.amount,
    );

  const best = ranked[0];

  return {
    total: best
      ? {
          amount: best.amount,
          score: best.score,
          source: "FULL",
        }
      : null,
    values: ranked.slice(0, 4).map((candidate) => candidate.amount),
  };
}

function merchantScore(
  line: string,
  index: number,
  source: MerchantCandidate["source"],
): number {
  const cleaned = cleanMerchant(line);
  const normalized = normalizeSearchText(cleaned);

  if (
    cleaned.length < 2 ||
    cleaned.length > 72 ||
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
    digits > Math.max(4, Math.floor(letters * 0.45))
  ) {
    return -1000;
  }

  if (
    /^\d/.test(cleaned) &&
    ADDRESS_NOISE.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    return -1000;
  }

  let score =
    source === "HEADER"
      ? 132
      : source === "ALT_FULL"
        ? 88
        : 80;

  score -= index * (source === "HEADER" ? 5 : 4);

  if (index <= 2) {
    score += 30;
  } else if (index <= 5) {
    score += 16;
  }

  if (letters >= 5) {
    score += 10;
  }

  if (
    STRONG_MERCHANT_WORDS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    score += 38;
  }

  const alphaCharacters = cleaned.replace(
    /[^\p{L}]/gu,
    "",
  );
  const uppercaseCharacters =
    alphaCharacters.match(/\p{Lu}/gu)?.length ?? 0;

  if (
    alphaCharacters.length >= 3 &&
    uppercaseCharacters / alphaCharacters.length >= 0.72
  ) {
    score += 20;
  }

  if (
    ADDRESS_NOISE.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    score -= 50;
  }

  if (
    /@|\.COM\b|\.VN\b|\.MY\b|\.SG\b|\.TH\b/i.test(cleaned)
  ) {
    score -= 50;
  }

  if (
    /^\d/.test(cleaned) ||
    /\b\d{5,}\b/.test(cleaned)
  ) {
    score -= 44;
  }

  if (
    /^[A-Z]{1,4}\s*[:#-]?\s*\d+/i.test(cleaned)
  ) {
    score -= 34;
  }

  if (
    cleaned.split(/\s+/).length > 8
  ) {
    score -= 24;
  }

  return score;
}

function collectMerchantCandidates(
  text: string,
  source: MerchantCandidate["source"],
): MerchantCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map(cleanMerchant)
    .filter(Boolean)
    .slice(0, source === "HEADER" ? 16 : 22);

  const candidates: MerchantCandidate[] =
    lines.map((line, index) => ({
      value: line,
      score: merchantScore(line, index, source),
      source,
    }));

  for (
    let index = 0;
    index < Math.min(lines.length - 1, 8);
    index += 1
  ) {
    const first = lines[index];
    const second = lines[index + 1];

    if (
      first.length > 30 ||
      second.length > 30
    ) {
      continue;
    }

    const combined = `${first} ${second}`;
    const normalized = normalizeSearchText(combined);
    const hasMerchantWord = STRONG_MERCHANT_WORDS.some(
      (pattern) => pattern.test(normalized),
    );
    const hasNoise =
      MERCHANT_NOISE.some(
        (pattern) => pattern.test(normalized),
      ) ||
      ADDRESS_NOISE.some(
        (pattern) => pattern.test(normalized),
      );

    if (!hasMerchantWord || hasNoise) {
      continue;
    }

    candidates.push({
      value: combined,
      score:
        merchantScore(first, index, source) +
        24,
      source,
    });
  }

  return candidates.filter(
    (candidate) => candidate.score > 0,
  );
}

function rankMerchants(
  fullText: string,
  altFullText: string,
  headerText: string,
): {
  merchantName: string | null;
  merchantCandidates: string[];
  topScore: number | null;
  scoreGap: number;
} {
  const all = [
    ...collectMerchantCandidates(headerText, "HEADER"),
    ...collectMerchantCandidates(fullText, "FULL"),
    ...collectMerchantCandidates(altFullText, "ALT_FULL"),
  ];

  const grouped = new Map<
    string,
    { value: string; score: number; appearances: number }
  >();

  for (const candidate of all) {
    const key = normalizeSearchText(candidate.value);
    const existing = grouped.get(key);

    if (existing) {
      existing.score = Math.max(existing.score, candidate.score);
      existing.appearances += 1;
    } else {
      grouped.set(key, {
        value: candidate.value,
        score: candidate.score,
        appearances: 1,
      });
    }
  }

  const ranked = [...grouped.values()]
    .map((candidate) => ({
      ...candidate,
      score:
        candidate.score +
        Math.min(40, (candidate.appearances - 1) * 20),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.appearances - a.appearances ||
        a.value.length - b.value.length,
    )
    .slice(0, 5);

  return {
    merchantName:
      ranked[0]?.value ?? null,
    merchantCandidates:
      ranked.map(
        (candidate) =>
          candidate.value,
      ),
    topScore:
      ranked[0]?.score ?? null,
    scoreGap:
      ranked.length >= 2
        ? ranked[0].score -
          ranked[1].score
        : ranked[0]
          ? 100
          : 0,
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

function merchantFieldConfidence(
  merchant: string | null,
  topScore: number | null,
  scoreGap: number,
  ocrConfidence: number,
): ReceiptConfidence {
  if (!merchant || topScore === null) {
    return "LOW";
  }

  if (
    topScore >= 150 &&
    scoreGap >= 16 &&
    ocrConfidence >= 65
  ) {
    return "HIGH";
  }

  if (
    topScore >= 90 &&
    ocrConfidence >= 45
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function totalFieldConfidence(
  total: AmountCandidate | null,
  ocrConfidence: number,
): ReceiptConfidence {
  if (!total) {
    return "LOW";
  }

  if (
    total.score >= 145 &&
    ocrConfidence >= 65
  ) {
    return "HIGH";
  }

  if (
    total.score >= 105 &&
    ocrConfidence >= 45
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function receiptConfidence(
  merchant: string | null,
  total: AmountCandidate | null,
  merchantCandidates: string[],
  totalCandidates: number[],
  ocrConfidence: number,
): ReceiptConfidence {
  let score = 0;

  if (merchant) {
    score += 1;
  }

  if (merchantCandidates.length >= 2) {
    score += 1;
  }

  if (total && total.score >= 125) {
    score += 2;
  } else if (total) {
    score += 1;
  }

  if (totalCandidates.length >= 1) {
    score += 1;
  }

  if (ocrConfidence >= 72) {
    score += 1;
  }

  if (score >= 6) {
    return "HIGH";
  }

  if (score >= 3) {
    return "MEDIUM";
  }

  return "LOW";
}

export function parseReceiptText(
  rawText: string,
  fallbackCurrency: string | null,
  ocrConfidence = 0,
  headerText = "",
  altFullText = "",
  bottomText = "",
): ParsedReceipt {
  const merchants = rankMerchants(
    rawText,
    altFullText || rawText,
    headerText || rawText,
  );

  const totals = rankTotals(
    rawText,
    altFullText || rawText,
    bottomText || rawText,
  );

  const combinedText = [
    headerText,
    rawText,
    altFullText,
    bottomText,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    merchantName: merchants.merchantName,
    merchantCandidates:
      merchants.merchantCandidates,
    totalAmount: totals.total?.amount ?? null,
    totalCandidates: totals.values,
    currencyCode: detectCurrency(
      combinedText,
      fallbackCurrency,
    ),
    confidence: receiptConfidence(
      merchants.merchantName,
      totals.total,
      merchants.merchantCandidates,
      totals.values,
      ocrConfidence,
    ),
    merchantConfidence:
      merchantFieldConfidence(
        merchants.merchantName,
        merchants.topScore,
        merchants.scoreGap,
        ocrConfidence,
      ),
    totalConfidence:
      totalFieldConfidence(
        totals.total,
        ocrConfidence,
      ),
    rawText: combinedText,
  };
}
