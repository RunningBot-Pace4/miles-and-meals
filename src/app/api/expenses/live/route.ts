import {
  loadExpenseLiveData,
} from "@/lib/expense-live";
import { getSession } from "@/lib/session";
import {
  recordApiMetric,
} from "@/lib/performance";

export async function GET(
  request: Request,
) {
  const started = Date.now();
  const session = await getSession();

  if (!session) {
    const response = Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );

    await recordApiMetric({
      userId: null,
      route: "/api/expenses/live",
      method: "GET",
      durationMs:
        Date.now() - started,
      statusCode: 401,
    });

    return response;
  }

  const data =
    await loadExpenseLiveData(
      session.user,
    );

  await recordApiMetric({
    userId: session.user.id,
    route: "/api/expenses/live",
    method: "GET",
    durationMs:
      Date.now() - started,
    statusCode: 200,
  });

  return Response.json(
    data,
    {
      headers: {
        "cache-control":
          "no-store",
      },
    },
  );
}
