import { put } from "@vercel/blob";
import { canAccessCountry } from "@/lib/access";
import {
  safeReceiptFilename,
  validateReceiptFile,
} from "@/lib/receipt-files";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        error:
          "Receipt storage is not configured. Create a private Vercel Blob store for this project.",
      },
      { status: 503 },
    );
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

    if (!(await canAccessCountry(session.user, countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    validateReceiptFile(file);

    const filename = safeReceiptFilename(file.name);
    const blob = await put(
      `receipts/${session.user.id}/${Date.now()}-${filename}`,
      file,
      {
        access: "private",
        addRandomSuffix: true,
      },
    );

    return Response.json({
      receiptUrl: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to upload receipt.";

    console.error("[Miles & Meals] Receipt upload failed.", error);

    return Response.json({ error: message }, { status: 400 });
  }
}
