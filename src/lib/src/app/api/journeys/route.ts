import { db } from "@/db";
import { journeys } from "@/db/schema";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { createJourneySchema } from "@/lib/journey-validation";


export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = createJourneySchema.parse(await request.json());
    const rows = await db.insert(journeys).values({
      name: input.name,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      createdBy: session.user.id,
    }).returning({ id: journeys.id });
    return Response.json({ id: rows[0]?.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create Journey." }, { status: 400 });
  }
}
