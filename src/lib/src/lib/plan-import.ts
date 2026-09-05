export type PlanImportDraft = {
  title: string;
  itemDate: string;
  itemTime: string;
  area: string;
  provider: string;
  confirmationNo: string;
  notes: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

const monthNumbers: Record<string, string> = {
  jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
  apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
  aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10", october: "10",
  nov: "11", november: "11", dec: "12", december: "12",
};

function validDate(year: string, month: string, day: string): string {
  const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00Z`);
  return date.toISOString().slice(0, 10) === value ? value : "";
}

function parseDate(text: string): string {
  const iso = text.match(/\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)\b/);
  if (iso) return validDate(iso[1], iso[2], iso[3]);
  const local = text.match(/\b([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})\b/);
  if (local) return validDate(local[3], local[2], local[1]);
  const named = text.match(/\b([0-3]?\d)\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i);
  if (named) return validDate(named[3], monthNumbers[named[2].toLowerCase()] ?? "", named[1]);
  return "";
}

function parseTime(text: string): string {
  const twelve = text.match(/\b([01]?\d):([0-5]\d)\s*(am|pm)\b/i);
  if (twelve) {
    let hour = Number(twelve[1]) % 12;
    if (twelve[3].toLowerCase() === "pm") hour += 12;
    return `${String(hour).padStart(2, "0")}:${twelve[2]}`;
  }
  const twentyFour = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return twentyFour ? `${twentyFour[1].padStart(2, "0")}:${twentyFour[2]}` : "";
}

function valueAfterLabel(text: string, labels: string[]): string {
  // Horizontal whitespace only: a label at the end of a line must never
  // consume the next field as its value.
  const pattern = new RegExp(`(?:${labels.join("|")})[ \\t]*[:#-]?[ \\t]*([^\\n\\r]{2,100})`, "i");
  return text.match(pattern)?.[1]?.trim() ?? "";
}

export function parsePlanConfirmation(raw: string): PlanImportDraft {
  const text = raw.replace(/\r/g, "").trim();
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const confirmation = valueAfterLabel(text, ["confirmation(?: number)?", "booking(?: reference)?", "reservation(?: number)?", "PNR"])
    .split(/\s{2,}|[|,]/)[0]
    .replace(/[^A-Za-z0-9-]/g, "")
    .slice(0, 100);
  const provider = valueAfterLabel(text, ["airline", "hotel", "provider", "operator"])
    .split(/\s{2,}|[|,]/)[0]
    .slice(0, 160);
  const area = valueAfterLabel(text, ["location", "address", "destination", "arrival"])
    .split(/\s{2,}|[|]/)[0]
    .slice(0, 120);
  const titleLine = lines.find((line) => /flight|hotel|check[- ]?in|tour|train|bus|reservation|booking/i.test(line)) ?? lines[0] ?? "Imported travel plan";
  const itemDate = parseDate(text);
  const itemTime = parseTime(text);
  const detected = [itemDate, itemTime, confirmation, provider].filter(Boolean).length;

  return {
    title: titleLine.replace(/^(subject|booking|reservation)\s*:\s*/i, "").slice(0, 250),
    itemDate,
    itemTime,
    area,
    provider,
    confirmationNo: confirmation,
    notes: "Imported from a confirmation after manual review. Original message was not stored.",
    confidence: detected >= 3 ? "HIGH" : detected >= 1 ? "MEDIUM" : "LOW",
  };
}
