import { z } from "zod";

const ReceiptExtractionSchema = z.object({
  merchantName: z.string().nullable(),
  totalAmount: z.number().nullable(),
  currencyCode: z.string().nullable(),
  receiptDate: z.string().nullable(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function extractOutputText(response: OpenAIResponse): string | null {
  for (const output of response.output ?? []) {
    if (output.type !== "message") {
      continue;
    }

    for (const content of output.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }

      if (content.type === "refusal" && content.refusal) {
        throw new Error(`Receipt analysis was refused: ${content.refusal}`);
      }
    }
  }

  return null;
}

export async function analyzeReceiptImage(
  file: File,
): Promise<ReceiptExtraction> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Receipt AI is not configured. Add OPENAI_API_KEY to the server environment.",
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const imageUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RECEIPT_MODEL?.trim() || "gpt-5-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You extract travel expense data from receipt images. " +
                "Return the merchant/shop name exactly enough to recognize the business. " +
                "For totalAmount, use the final amount actually charged, not subtotal, tax, discount, cash tendered, balance, or change. " +
                "Return a 3-letter ISO-style currency code when clear. " +
                "Return receiptDate as YYYY-MM-DD only when clearly printed. " +
                "If a field cannot be read confidently, return null instead of guessing.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Read this receipt. I need the shop name for the expense description and the final receipt total.",
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "receipt_expense",
          strict: true,
          schema: {
            type: "object",
            properties: {
              merchantName: {
                type: ["string", "null"],
              },
              totalAmount: {
                type: ["number", "null"],
              },
              currencyCode: {
                type: ["string", "null"],
              },
              receiptDate: {
                type: ["string", "null"],
              },
              confidence: {
                type: "string",
                enum: ["HIGH", "MEDIUM", "LOW"],
              },
            },
            required: [
              "merchantName",
              "totalAmount",
              "currencyCode",
              "receiptDate",
              "confidence",
            ],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `Receipt AI request failed with status ${response.status}.`,
    );
  }

  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error("Receipt AI returned no readable result.");
  }

  const extracted = ReceiptExtractionSchema.parse(JSON.parse(outputText));

  return {
    merchantName: extracted.merchantName?.trim() || null,
    totalAmount:
      extracted.totalAmount !== null && extracted.totalAmount > 0
        ? extracted.totalAmount
        : null,
    currencyCode:
      extracted.currencyCode?.trim().toUpperCase().slice(0, 3) || null,
    receiptDate: extracted.receiptDate?.trim() || null,
    confidence: extracted.confidence,
  };
}
