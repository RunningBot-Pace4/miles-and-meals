import { z } from "zod";

const optionalIsoDate = z
  .string()
  .trim()
  .max(10)
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Use a valid YYYY-MM-DD date.",
  });

function validateDateOrder(
  value: { startDate: string; endDate: string },
  context: { addIssue: (issue: { code: "custom"; path: string[]; message: string }) => void },
) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "Journey end date cannot be before the start date.",
    });
  }
}

export const createJourneySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    startDate: optionalIsoDate.optional().default(""),
    endDate: optionalIsoDate.optional().default(""),
  })
  .superRefine(validateDateOrder);

export const updateJourneySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    startDate: optionalIsoDate.optional().default(""),
    endDate: optionalIsoDate.optional().default(""),
    tripIds: z.array(z.string().uuid()).max(30).default([]),
  })
  .superRefine(validateDateOrder);
