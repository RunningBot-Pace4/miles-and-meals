import { describe, expect, it } from "vitest";
import { normalizeFlightScheduleRecord } from "@/lib/flight-schedule";

describe("flight schedule normalization", () => {
  it("preserves airport-local scheduled date and time without timezone conversion", () => {
    const result = normalizeFlightScheduleRecord({
      flight_date: "2026-08-25",
      flight_status: "scheduled",
      flight: { iata: "AK6128" },
      airline: { name: "AirAsia" },
      departure: {
        airport: "Kuala Lumpur International",
        iata: "KUL",
        scheduled: "2026-08-25T07:05:00+08:00",
        terminal: "2",
        gate: "J8",
      },
      arrival: {
        airport: "Tan Son Nhat International",
        iata: "SGN",
        scheduled: "2026-08-25T08:10:00+07:00",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      flightNumber: "AK6128",
      flightDate: "2026-08-25",
      departureTime: "07:05",
      arrivalTime: "08:10",
      route: "KUL → SGN",
      airline: "AirAsia",
    }));
  });
});
