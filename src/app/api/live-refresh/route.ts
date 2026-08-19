import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  return Response.json(
    {
      ok: true,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
