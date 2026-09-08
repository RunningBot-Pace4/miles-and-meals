import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function parseImageDataUrl(value: string): {
  contentType: string;
  bytes: Uint8Array;
} | null {
  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
  );

  if (!match) {
    return null;
  }

  return {
    contentType: match[1],
    bytes: Uint8Array.from(Buffer.from(match[2], "base64")),
  };
}

export async function GET(_request: Request, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const row = (
    await db
      .select({
        countryId: settlements.countryId,
        paymentProofData: settlements.paymentProofData,
      })
      .from(settlements)
      .where(eq(settlements.id, id))
      .limit(1)
  )[0];

  if (!row) {
    return Response.json({ error: "Payment not found." }, { status: 404 });
  }

  if (!(await canAccessCountry(session.user, row.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!row.paymentProofData) {
    return Response.json(
      { error: "No payment proof is attached." },
      { status: 404 },
    );
  }

  const image = parseImageDataUrl(row.paymentProofData);

  if (!image) {
    return Response.json(
      { error: "Stored payment proof is invalid." },
      { status: 422 },
    );
  }

  return new Response(image.bytes, {
    headers: {
      "content-type": image.contentType,
      "cache-control": "private, max-age=300",
      "content-disposition": `inline; filename="payment-proof-${id}.jpg"`,
      "x-content-type-options": "nosniff",
    },
  });
}
