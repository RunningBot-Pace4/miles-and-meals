import { z } from "zod";
import { isIsoCalendarDate, isValidDateRange } from "@/lib/date-range";

const optionalIsoDate = z
  .string()
  .trim()
  .max(10)
  .refine((value) => value === "" || isIsoCalendarDate(value), {
    message: "Use a valid YYYY-MM-DD date.",
  });

function validateDateOrder(
  value: { startDate: string; endDate: string },
  context: { addIssue: (issue: { code: "custom"; path: string[]; message: string }) => void },
) {
  if (!isValidDateRange(value.startDate, value.endDate)) {
    context.addIssue({
      code: "custom",
      path: [value.startDate ? "endDate" : "startDate"],
      message:
        value.startDate && !value.endDate
          ? "Choose the Journey end date."
          : !value.startDate && value.endDate
            ? "Choose the Journey start date."
            : "Journey end date cannot be before the start date.",
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
