import { getDailyFxRate } from "@/lib/fx";
import { getSession } from "@/lib/session";
import { publicFxQuerySchema } from "@/lib/validation";

export async function GET(
  request: Request,
) {
  const session =
    await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(
      request.url,
    );
    const input =
      publicFxQuerySchema.parse({
        base:
          url.searchParams.get(
            "base",
          ) ?? "",
        quote:
          url.searchParams.get(
            "quote",
          ) ?? "",
      });

    const result =
      await getDailyFxRate(
        input.base,
        input.quote,
      );

    return Response.json(
      result,
      {
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load FX rate.",
      },
      { status: 400 },
    );
  }
}
