export type BookingImport = {
  kind: "FLIGHT" | "HOTEL" | "TICKET" | "TRAIN" | "BOOKING";
  title: string;
  provider: string;
  confirmationNo: string;
  bookingDate: string;
  bookingTime: string;
  flightNumber: string;
  route: string;
  rawText: string;
};

function lines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function isoDate(text: string): string {
  const patterns = [
    /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/,
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/,
  ];
  for (const [index, pattern] of patterns.entries()) {
    const match = text.match(pattern);
    if (!match) continue;
    const [year, month, day] = index === 0
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : [Number(match[3]), Number(match[2]), Number(match[1])];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }
  return "";
}


function decodePdfLiteralString(value: string): string {
  return value
    .replace(/\\([0-7]{1,3})/g, (_match, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    )
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\\r?\n/g, "");
}

/**
 * Small, dependency-free PDF text fallback for uncompressed text PDFs.
 * Many PDFs compress their text streams; in that case we intentionally return
 * an empty string so the UI asks for a screenshot/photo instead of pretending
 * binary data is a booking confirmation.
 */
export function extractPdfTextBestEffort(bytes: Uint8Array): string {
  if (bytes.length < 5) return "";

  const source = new TextDecoder("latin1").decode(bytes);
  if (!source.startsWith("%PDF-")) return "";

  const chunks: string[] = [];
  const blocks = source.match(/BT[\s\S]*?ET/g) ?? [];

  for (const block of blocks) {
    for (const match of block.matchAll(/\(((?:\\.|[^\\()])*)\)/g)) {
      const decoded = decodePdfLiteralString(match[1]).replace(/\s+/g, " ").trim();
      if (decoded) chunks.push(decoded);
    }

    for (const match of block.matchAll(/(?<!<)<([0-9A-Fa-f]{4,})>(?!>)/g)) {
      const hex = match[1];
      if (hex.length % 2 !== 0) continue;
      try {
        const decoded = Array.from({ length: hex.length / 2 }, (_, index) =>
          String.fromCharCode(Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)),
        ).join("").replace(/\s+/g, " ").trim();
        if (decoded) chunks.push(decoded);
      } catch {
        // Ignore malformed hex text objects.
      }
    }
  }

  const output = chunks.join("\n").slice(0, 30_000);
  const readableCharacters = output.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return readableCharacters >= 8 ? output : "";
}


const AIRLINE_BY_CODE: Record<string, string> = {
  AK: "AirAsia",
  D7: "AirAsia X",
  MH: "Malaysia Airlines",
  OD: "Batik Air Malaysia",
  TR: "Scoot",
  SQ: "Singapore Airlines",
  VJ: "VietJet Air",
  VN: "Vietnam Airlines",
  TG: "Thai Airways",
  FD: "Thai AirAsia",
  QZ: "Indonesia AirAsia",
  EK: "Emirates",
  QR: "Qatar Airways",
  CX: "Cathay Pacific",
  JQ: "Jetstar",
  "5J": "Cebu Pacific",
  "3K": "Jetstar Asia",
  FY: "Firefly",
  JL: "Japan Airlines",
  NH: "ANA",
  GA: "Garuda Indonesia",
  BR: "EVA Air",
  CI: "China Airlines",
  KE: "Korean Air",
  OZ: "Asiana Airlines",
  PR: "Philippine Airlines",
};

function detectFlightNumber(text: string): string {
  const explicit = text.match(
    /(?:FLIGHT(?:\s*(?:NO|NUMBER))?|FLT)\s*[:#-]?\s*([A-Z0-9]{2,3})\s*[- ]?\s*(\d{1,4}[A-Z]?)/i,
  );
  if (explicit) return `${explicit[1].toUpperCase()}${explicit[2].toUpperCase()}`;

  const standaloneLine = text.toUpperCase().match(
    /(?:^|\n)\s*([A-Z0-9]{2})\s*[- ]?\s*(\d{1,4}[A-Z]?)\s*(?=$|\n)/,
  );
  if (standaloneLine) {
    return `${standaloneLine[1]}${standaloneLine[2]}`;
  }

  const trimmed = text.trim().toUpperCase();
  const onlyCode = /^([A-Z0-9]{2})\s*[- ]?\s*(\d{1,4}[A-Z]?)$/.exec(trimmed);
  if (!onlyCode) return "";

  const prefix = onlyCode[1];
  // Bare flight lookup uses the 2-character IATA-style airline prefix.
  // A value such as ABC123 remains ambiguous and is treated as a booking ref.
  return `${prefix}${onlyCode[2]}`;
}

function detectBareBookingReference(text: string, flightNumber: string): string {
  if (flightNumber) return "";
  const trimmed = text.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{3,11}$/.test(trimmed) ? trimmed : "";
}

function detectRoute(text: string): string {
  const match = text.toUpperCase().match(
    /\b([A-Z]{3})\s*(?:→|->|TO)\s*([A-Z]{3})\b/,
  );
  return match ? `${match[1]} → ${match[2]}` : "";
}

export function parseBookingText(input: string): BookingImport {
  const rawText = input.replace(/\u0000/g, " ").slice(0, 30_000);
  const rows = lines(rawText);
  const upper = rawText.toUpperCase();
  const flightNumber = detectFlightNumber(rawText);
  const route = detectRoute(rawText);
  const bareBookingReference = detectBareBookingReference(rawText, flightNumber);

  let kind: BookingImport["kind"] = "BOOKING";
  if (flightNumber || /\bFLIGHT\b|\bAIRLINE\b|\bBOARDING\b|\bDEPARTURE\b.*\bARRIVAL\b/.test(upper)) kind = "FLIGHT";
  else if (/\bHOTEL\b|\bCHECK[- ]?IN\b|\bCHECK[- ]?OUT\b|\bROOM\b/.test(upper)) kind = "HOTEL";
  else if (/\bTRAIN\b|\bRAIL\b|\bSTATION\b/.test(upper)) kind = "TRAIN";
  else if (/\bTICKET\b|\bADMISSION\b|\bATTRACTION\b/.test(upper)) kind = "TICKET";

  const confirmation =
    rawText.match(/(?:CONFIRMATION|BOOKING|RESERVATION|PNR|REFERENCE|REF)\s*(?:NO\.?|NUMBER|#|:)??\s*[:#-]?\s*([A-Z0-9-]{4,18})/i)?.[1] ??
    bareBookingReference;
  const time = rawText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)?.[0] ?? "";

  const providerRow = rows.find((line) => /AIR|HOTEL|RESORT|HOSTEL|RAIL|TRAIN|BOOKING|AIRASIA|MALAYSIA|SCOOT|AGODA|EXPEDIA/i.test(line));
  const flightCode =
    Object.keys(AIRLINE_BY_CODE).find(
      (code) =>
        flightNumber.startsWith(code) &&
        /^\d/.test(flightNumber.slice(code.length)),
    ) ??
    flightNumber.match(/^([A-Z]{2,3})(?=\d)/)?.[1] ??
    "";
  const airlineName = flightCode ? AIRLINE_BY_CODE[flightCode] ?? "" : "";
  const provider = (providerRow || airlineName || rows[0] || "").slice(0, 160);
  const titleCandidate = rows.find((line) =>
    line.length >= 4 &&
    line.length <= 100 &&
    !/^(BOOKING|CONFIRMATION|DATE|TIME|TOTAL|AMOUNT)$/i.test(line) &&
    line.trim().toUpperCase() !== flightNumber,
  );
  const fallbackTitle =
    kind === "FLIGHT"
      ? `Flight${flightNumber ? ` ${flightNumber}` : ""}${route ? ` · ${route}` : ""}`
      : kind === "HOTEL"
        ? "Hotel reservation"
        : kind === "TRAIN"
          ? "Train booking"
          : kind === "TICKET"
            ? "Ticket booking"
            : "Travel booking";

  return {
    kind,
    title: (titleCandidate ?? fallbackTitle).slice(0, 250),
    provider,
    confirmationNo: confirmation,
    bookingDate: isoDate(rawText),
    bookingTime: time,
    flightNumber,
    route,
    rawText,
  };
}
