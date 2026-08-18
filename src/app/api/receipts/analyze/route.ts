import { canAccessCountry } from "@/lib/access";
import { analyzeReceiptImage } from "@/lib/receipt-ai";
import { validateReceiptFile } from "@/lib/receipt-files";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const countryId = String(form.get("countryId") ?? "");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Choose a receipt photo first." },
        { status: 400 },
      );
    }

    if (!countryId) {
      return Response.json(
        { error: "Choose a country first." },
        { status: 400 },
      );
    }

    if (!(await canAccessCountry(session.user, countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    validateReceiptFile(file);
    const receipt = await analyzeReceiptImage(file);

    if (!receipt.merchantName && !receipt.totalAmount) {
      return Response.json(
        {
          error:
            "I could not confidently read the shop name or final amount. Try a clearer photo showing the whole receipt.",
        },
        { status: 422 },
      );
    }

    return Response.json({ receipt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to analyze receipt.";

    console.error("[Miles & Meals] Receipt analysis failed.", error);

    return Response.json({ error: message }, { status: 400 });
  }
}
