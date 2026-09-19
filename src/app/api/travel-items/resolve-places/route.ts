import { z } from "zod";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { getSession } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { searchFreePlace } from "@/lib/free-place-lookup";

export const runtime = "nodejs";
const schema = z.object({
  countryId: z.string().uuid(),
  places: z.array(z.object({
    clientKey: z.string().min(1).max(1000),
    title: z.string().trim().min(1).max(250),
    placeId: z.string().regex(/^[A-Za-z0-9_-]{3,300}$/).optional(),
  })).min(1).max(2),
});

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in before checking locations." }, { status: 401 });
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "Free location lookup is not configured. Add GEOAPIFY_API_KEY in Vercel." }, { status: 503 });
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await request.json()); }
  catch { return Response.json({ error: "Choose a valid trip and up to 2 places." }, { status: 400 }); }
  if (!(await canAccessCountry(session.user, input.countryId))) return Response.json({ error: "You no longer have access to this trip." }, { status: 403 });
  const country = await getCountryWithTrip(input.countryId);
  if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
  try {
    const results = [];
    for (const place of input.places) {
      results.push(await searchFreePlace({ ...place, countryName: country.countryName, apiKey }));
      // Pace each import below the free account's five requests/second limit.
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return Response.json({ matches: results.filter(Boolean), missing: results.filter((result) => !result).length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Free location lookup is temporarily unavailable." }, { status: 502 });
  }
}
