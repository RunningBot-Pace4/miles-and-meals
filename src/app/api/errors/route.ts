import { z } from "zod";
import { recordAppError } from "@/lib/error-log";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

const errorSchema = z.object({
  route: z.string().max(500).optional(),
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  digest: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const input = errorSchema.parse(
      await request.json(),
    );

    await recordAppError({
      userId: session.user.id,
      route: input.route,
      message: input.message,
      stack: input.stack,
      digest: input.digest,
      userAgent:
        request.headers.get("user-agent"),
    });

    return Response.json(
      { ok: true },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { error: "Invalid error report." },
      { status: 400 },
    );
  }
}
