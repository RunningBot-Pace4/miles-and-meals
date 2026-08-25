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

const MONTH_NUMBER: Record<string, number> = {
  JAN: 1,
  JANUARY: 1,
  FEB: 2,
  FEBRUARY: 2,
  MAR: 3,
  MARCH: 3,
  APR: 4,
  APRIL: 4,
  MAY: 5,
  JUN: 6,
  JUNE: 6,
  JUL: 7,
  JULY: 7,
  AUG: 8,
  AUGUST: 8,
  SEP: 9,
  SEPT: 9,
  SEPTEMBER: 9,
  OCT: 10,
  OCTOBER: 10,
  NOV: 11,
  NOVEMBER: 11,
  DEC: 12,
  DECEMBER: 12,
};

function validIsoDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
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
    const result = validIsoDate(year, month, day);
    if (result) return result;
  }

  const dayFirst = text.match(
    /\b(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]{3,9})\s*,?\s*(20\d{2})\b/i,
  );
  if (dayFirst) {
    const result = validIsoDate(
      Number(dayFirst[3]),
      MONTH_NUMBER[dayFirst[2].toUpperCase()] ?? 0,
      Number(dayFirst[1]),
    );
    if (result) return result;
  }

  const monthFirst = text.match(
    /\b([A-Z]{3,9})\s+(\d{1,2})(?:ST|ND|RD|TH)?\s*,?\s*(20\d{2})\b/i,
  );
  if (monthFirst) {
    return validIsoDate(
      Number(monthFirst[3]),
      MONTH_NUMBER[monthFirst[1].toUpperCase()] ?? 0,
      Number(monthFirst[2]),
    );
  }

  return "";
}

function clockTime(text: string): string {
  const twelveHour = text.match(/\b(\d{1,2})(?::([0-5]\d))?\s*([AP])\.?M\.?\b/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    if (hour < 1 || hour > 12) return "";
    const minute = Number(twelveHour[2] ?? "0");
    if (twelveHour[3].toUpperCase() === "A") hour %= 12;
    else if (hour < 12) hour += 12;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const twentyFourHour = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  return twentyFourHour
    ? `${String(Number(twentyFourHour[1])).padStart(2, "0")}:${twentyFourHour[2]}`
    : "";
}

function departureDateTime(text: string): { date: string; time: string } {
  const rows = lines(text);
  const excludedClockLabel = /\b(BOARD(?:ING)?|CHECK[ -]?IN|GATE\s*CLOSE|ARRIV(?:AL|E|ING))\b/i;
  const labeledDepartureClock = (nearby: string[]) => {
    for (const row of nearby) {
      if (
        /\b(SCHEDULED\s*DEPARTURE|DEPARTURE\s*TIME|DEPART(?:URE|ING)?)\b/i.test(row) &&
        !excludedClockLabel.test(row)
      ) {
        const value = clockTime(row);
        if (value) return value;
      }
    }
    for (const row of nearby) {
      if (excludedClockLabel.test(row)) continue;
      const value = clockTime(row);
      if (value) return value;
    }
    return "";
  };
  const preferred = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      /\b(DEPART(?:URE|ING)?|FLIGHT\s*DATE|OUTBOUND|TAKE[ -]?OFF|BOARDING\s*DATE|SCHEDULED\s*DEPARTURE)\b/i.test(row) &&
      !/\b(BOOKED|BOOKING\s*DATE|ISSUED|PURCHASED|CREATED|PAYMENT|TRANSACTION)\b/i.test(row),
    );

  for (const { index } of preferred) {
    const nearby = rows.slice(index, index + 5);
    const context = nearby.join("\n");
    const date = isoDate(context);
    const time = labeledDepartureClock(nearby);
    if (date || time) return { date, time };
  }

  const safeRows = rows.filter(
    (row) => !/\b(BOOKED|BOOKING\s*DATE|ISSUED|PURCHASED|CREATED|PAYMENT|TRANSACTION|EMAIL\s*SENT)\b/i.test(row),
  );
  const safeText = safeRows.join("\n");
  return {
    date: isoDate(safeText),
    time: labeledDepartureClock(safeRows),
  };
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
  const upper = text.toUpperCase();
  const match = upper.match(
    /\b([A-Z]{3})\s*(?:→|->|TO|–|—|-)\s*([A-Z]{3})\b/,
  );
  if (match) return `${match[1]} → ${match[2]}`;

  const labeledDeparture = upper.match(
    /\b(?:DEPARTURE|DEPARTING|FROM)\b[^\n]{0,100}?\(([A-Z]{3})\)/,
  )?.[1] ?? upper.match(/\b(?:DEPARTURE|DEPARTING|FROM)\s*[:#-]?\s*([A-Z]{3})\b/)?.[1];
  const labeledArrival = upper.match(
    /\b(?:ARRIVAL|ARRIVING|TO)\b[^\n]{0,100}?\(([A-Z]{3})\)/,
  )?.[1] ?? upper.match(/\b(?:ARRIVAL|ARRIVING|TO)\s*[:#-]?\s*([A-Z]{3})\b/)?.[1];
  if (labeledDeparture && labeledArrival && labeledDeparture !== labeledArrival) {
    return `${labeledDeparture} → ${labeledArrival}`;
  }

  const parenthesizedCodes = [...upper.matchAll(/\(([A-Z]{3})\)/g)].map((item) => item[1]);
  return parenthesizedCodes.length >= 2 && parenthesizedCodes[0] !== parenthesizedCodes[1]
    ? `${parenthesizedCodes[0]} → ${parenthesizedCodes[1]}`
    : "";
}

export function parseBookingText(input: string): BookingImport {
  const rawText = input.replace(/\u0000/g, " ").slice(0, 30_000);
  const rows = lines(rawText);
  const upper = rawText.toUpperCase();
  const flightNumber = detectFlightNumber(rawText);
  const route = detectRoute(rawText);
  const departure = departureDateTime(rawText);
  const bareBookingReference = detectBareBookingReference(rawText, flightNumber);

  let kind: BookingImport["kind"] = "BOOKING";
  if (flightNumber || /\bFLIGHT\b|\bAIRLINE\b|\bBOARDING\b|\bDEPARTURE\b.*\bARRIVAL\b/.test(upper)) kind = "FLIGHT";
  else if (/\bHOTEL\b|\bCHECK[- ]?IN\b|\bCHECK[- ]?OUT\b|\bROOM\b/.test(upper)) kind = "HOTEL";
  else if (/\bTRAIN\b|\bRAIL\b|\bSTATION\b/.test(upper)) kind = "TRAIN";
  else if (/\bTICKET\b|\bADMISSION\b|\bATTRACTION\b/.test(upper)) kind = "TICKET";

  const confirmation =
    rawText.match(/(?:CONFIRMATION|BOOKING|RESERVATION|PNR|REFERENCE|REF)\s*(?:NO\.?|NUMBER|#|:)??\s*[:#-]?\s*([A-Z0-9-]{4,18})/i)?.[1] ??
    bareBookingReference;
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
  const provider = (airlineName || providerRow || rows[0] || "").slice(0, 160);
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
    title: (kind === "FLIGHT" ? fallbackTitle : titleCandidate ?? fallbackTitle).slice(0, 250),
    provider,
    confirmationNo: confirmation,
    bookingDate: departure.date,
    bookingTime: departure.time,
    flightNumber,
    route,
    rawText,
  };
}
