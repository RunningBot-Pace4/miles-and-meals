import { db } from "@/db";
import { apiMetrics } from "@/db/schema";

type ApiMetricInput = {
  userId?: string | null;
  route: string;
  method: string;
  durationMs: number;
  statusCode: number;
};

export async function recordApiMetric(
  input: ApiMetricInput,
): Promise<void> {
  try {
    await db.insert(apiMetrics).values({
      userId: input.userId ?? null,
      route: input.route,
      method:
        input.method
          .trim()
          .toUpperCase()
          .slice(0, 12),
      durationMs: Math.max(
        0,
        Math.round(
          input.durationMs,
        ),
      ),
      statusCode:
        Math.max(
          100,
          Math.min(
            599,
            Math.round(
              input.statusCode,
            ),
          ),
        ),
    });
  } catch {
    // Performance telemetry is best-effort and must never affect app behavior.
  }
}
