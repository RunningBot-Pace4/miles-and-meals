import { z } from "zod";
import { canAccessCountry } from "@/lib/access";
import { getSession } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { routeDistance } from "@/lib/route-distance";
export const runtime = "nodejs";
const point = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const schema = z.object({ countryId: z.string().uuid(), start: point, end: point, mode: z.enum(["walk", "drive"]), refresh: z.boolean().optional() });
export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to calculate routes." }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Choose valid locations and a travel mode." }, { status: 400 });
  if (!(await canAccessCountry(session.user, input.data.countryId))) return Response.json({ error: "Trip access denied." }, { status: 403 });
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "Route lookup needs GEOAPIFY_API_KEY in Vercel." }, { status: 503 });
  try { return Response.json({ route: await routeDistance(input.data.start, input.data.end, input.data.mode, apiKey, input.data.refresh) }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "Route lookup is temporarily unavailable.";
    return Response.json({ error: message }, { status: message.includes("allowance") ? 429 : 502 });
  }
}
