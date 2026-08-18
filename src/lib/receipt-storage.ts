import { del } from "@vercel/blob";

function isVercelBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function deleteStoredReceipt(
  receiptUrl: string | null | undefined,
): Promise<void> {
  if (
    !receiptUrl ||
    !process.env.BLOB_READ_WRITE_TOKEN ||
    !isVercelBlobUrl(receiptUrl)
  ) {
    return;
  }

  try {
    await del(receiptUrl);
  } catch (error) {
    console.error(
      "[Miles & Meals] Unable to delete old receipt blob.",
      error,
    );
  }
}
