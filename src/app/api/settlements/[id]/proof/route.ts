import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function parseImageDataUrl(value: string): {
  contentType: string;
  bytes: Uint8Array<ArrayBuffer>;
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
        tripId: settlements.tripId,
        fromUserId: settlements.fromUserId,
        toUserId: settlements.toUserId,
        paymentProofData: settlements.paymentProofData,
      })
      .from(settlements)
      .where(eq(settlements.id, id))
      .limit(1)
  )[0];

  if (!row) {
    return Response.json({ error: "Payment not found." }, { status: 404 });
  }

  const capabilities = await getTripCapabilities(
    session.user,
    row.tripId,
  );
  const canView =
    row.fromUserId === session.user.id ||
    row.toUserId === session.user.id ||
    capabilities.canManage;

  if (!canView) {
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
      "cache-control": "private, no-store",
      "content-disposition": `inline; filename="payment-proof.${image.contentType === "image/jpeg" ? "jpg" : image.contentType.split("/")[1]}"`,
      "x-content-type-options": "nosniff",
    },
  });
}
