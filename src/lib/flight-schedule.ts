export type FlightScheduleResult = {
  flightNumber: string;
  flightDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  route: string;
  airline: string;
  status: string;
  departureTerminal: string;
  departureGate: string;
  source: "Aviationstack";
};

type AviationstackFlight = {
  flight_date?: unknown;
  flight_status?: unknown;
  departure?: {
    airport?: unknown;
    iata?: unknown;
    scheduled?: unknown;
    estimated?: unknown;
    terminal?: unknown;
    gate?: unknown;
  } | null;
  arrival?: {
    airport?: unknown;
    iata?: unknown;
    scheduled?: unknown;
    estimated?: unknown;
  } | null;
  airline?: { name?: unknown } | null;
  flight?: { iata?: unknown } | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function localDateTime(value: unknown): { date: string; time: string } {
  const raw = text(value);
  const match = /^(20\d{2}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(raw);
  return match ? { date: match[1], time: match[2] } : { date: "", time: "" };
}

export function normalizeFlightScheduleRecord(
  input: unknown,
): FlightScheduleResult | null {
  if (!input || typeof input !== "object") return null;
  const record = input as AviationstackFlight;
  const flightNumber = text(record.flight?.iata).replace(/[\s-]/g, "").toUpperCase();
  const departure = localDateTime(record.departure?.scheduled ?? record.departure?.estimated);
  const arrival = localDateTime(record.arrival?.scheduled ?? record.arrival?.estimated);
  const departureCode = text(record.departure?.iata).toUpperCase();
  const arrivalCode = text(record.arrival?.iata).toUpperCase();

  if (!flightNumber || !departure.date || !departure.time) return null;

  return {
    flightNumber,
    flightDate: departure.date || text(record.flight_date),
    departureTime: departure.time,
    arrivalDate: arrival.date,
    arrivalTime: arrival.time,
    departureAirport: text(record.departure?.airport),
    arrivalAirport: text(record.arrival?.airport),
    route: departureCode && arrivalCode ? `${departureCode} → ${arrivalCode}` : "",
    airline: text(record.airline?.name),
    status: text(record.flight_status),
    departureTerminal: text(record.departure?.terminal),
    departureGate: text(record.departure?.gate),
    source: "Aviationstack",
  };
}
