import { describe, expect, it } from "vitest";
import { parseBookingText } from "@/lib/booking-parser";
import { selfServiceTripSchema, selfServiceTripUpdateSchema } from "@/lib/validation";

describe("v78 Trip Inbox quick flight recognition", () => {
  it("recognizes a flight number typed by itself without inventing schedule data", () => {
    const parsed = parseBookingText("AK6128");
    expect(parsed.kind).toBe("FLIGHT");
    expect(parsed.flightNumber).toBe("AK6128");
    expect(parsed.provider).toBe("AirAsia");
    expect(parsed.title).toContain("AK6128");
    expect(parsed.bookingDate).toBe("");
    expect(parsed.bookingTime).toBe("");
    expect(parsed.route).toBe("");
  });


  it("treats an ambiguous bare booking reference as a booking reference, not a made-up flight", () => {
    const parsed = parseBookingText("ABC123");
    expect(parsed.kind).toBe("BOOKING");
    expect(parsed.flightNumber).toBe("");
    expect(parsed.confirmationNo).toBe("ABC123");
    expect(parsed.bookingDate).toBe("");
  });

  it("extracts an explicit flight route when it is present in the confirmation", () => {
    const parsed = parseBookingText("Flight MH123\nKUL -> NRT\n2026-11-05\n09:30");
    expect(parsed.kind).toBe("FLIGHT");
    expect(parsed.flightNumber).toBe("MH123");
    expect(parsed.route).toBe("KUL → NRT");
    expect(parsed.bookingDate).toBe("2026-11-05");
    expect(parsed.bookingTime).toBe("09:30");
  });

  it("uses departure details instead of an earlier booking-issued timestamp", () => {
    const parsed = parseBookingText(`
      Booking created: 20/08/2026 21:44
      Flight AK6128
      Kuala Lumpur (KUL) to Ho Chi Minh City (SGN)
      Departure: 25 Aug 2026, 7:05 AM
      Arrival: 25 Aug 2026, 8:10 AM
    `);

    expect(parsed.flightNumber).toBe("AK6128");
    expect(parsed.route).toBe("KUL → SGN");
    expect(parsed.bookingDate).toBe("2026-08-25");
    expect(parsed.bookingTime).toBe("07:05");
    expect(parsed.provider).toBe("AirAsia");
  });

  it("supports month-first departure dates and 12-hour afternoon times", () => {
    const parsed = parseBookingText(`Flight MH123\nDeparture Aug 25, 2026 at 2:35 PM\nKUL - NRT`);
    expect(parsed.bookingDate).toBe("2026-08-25");
    expect(parsed.bookingTime).toBe("14:35");
    expect(parsed.route).toBe("KUL → NRT");
  });

  it("does not mistake boarding or arrival time for scheduled departure time", () => {
    const parsed = parseBookingText(`
      Flight AK6128
      KUL → SGN
      Flight date 25 Aug 2026
      Boarding time 06:20
      Scheduled departure 07:05
      Arrival 08:10
    `);
    expect(parsed.bookingDate).toBe("2026-08-25");
    expect(parsed.bookingTime).toBe("07:05");
  });
});

describe("v78 trip date integrity", () => {
  it("accepts a normal start/end range", () => {
    const result = selfServiceTripSchema.safeParse({
      name: "Japan",
      baseCurrency: "MYR",
      startDate: "2026-11-05",
      endDate: "2026-11-09",
      firstCountry: {
        code: "JP",
        defaultExchangeRate: 0.03,
        fxRateDate: "",
        fxRateProvider: "Manual",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects end dates before the start date on create and edit", () => {
    const create = selfServiceTripSchema.safeParse({
      name: "Japan",
      baseCurrency: "MYR",
      startDate: "2026-11-09",
      endDate: "2026-11-05",
      firstCountry: {
        code: "JP",
        defaultExchangeRate: 0.03,
        fxRateDate: "",
        fxRateProvider: "Manual",
      },
    });
    const edit = selfServiceTripUpdateSchema.safeParse({
      name: "Japan",
      startDate: "2026-11-09",
      endDate: "2026-11-05",
    });

    expect(create.success).toBe(false);
    expect(edit.success).toBe(false);
  });
});
