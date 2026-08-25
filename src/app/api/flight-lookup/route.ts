import { getSession } from "@/lib/session";
import { normalizeFlightScheduleRecord } from "@/lib/flight-schedule";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const flightNumber = (url.searchParams.get("flightNumber") ?? "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
  const date = url.searchParams.get("date") ?? "";

  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flightNumber)) {
    return Response.json({ error: "Enter a valid flight number, for example AK6128." }, { status: 400 });
  }
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Choose the flight date before retrieving its schedule." }, { status: 400 });
  }

  const accessKey = process.env.AVIATIONSTACK_API_KEY?.trim() ?? "";
  if (!accessKey) {
    return Response.json(
      { error: "Live flight schedule lookup is not enabled on this deployment. Upload the booking confirmation or enter the departure details manually." },
      { status: 503 },
    );
  }

  const providerUrl = new URL("https://api.aviationstack.com/v1/flights");
  providerUrl.searchParams.set("access_key", accessKey);
  providerUrl.searchParams.set("flight_iata", flightNumber);
  providerUrl.searchParams.set("flight_date", date);
  providerUrl.searchParams.set("limit", "10");

  try {
    const response = await fetch(providerUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: unknown[];
      error?: { message?: string };
    };

    if (!response.ok || payload.error) {
      return Response.json(
        { error: payload.error?.message ?? "The flight-data provider could not complete this lookup." },
        { status: 502 },
      );
    }

    const schedules = (payload.data ?? [])
      .map((record) => normalizeFlightScheduleRecord(record))
      .filter((record) => record?.flightNumber === flightNumber && record.flightDate === date);
    const schedule = schedules[0] ?? null;

    if (!schedule) {
      return Response.json(
        { error: "No exact schedule was found for that flight number and date. Check the date or upload the airline confirmation." },
        { status: 404 },
      );
    }

    return Response.json({ schedule }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return Response.json(
      { error: "Flight schedule lookup is temporarily unavailable. Your entered details were not changed." },
      { status: 502 },
    );
  }
}
