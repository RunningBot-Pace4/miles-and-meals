import { z } from "zod";
import { SUPPORTED_REGIONAL_LOCALES, SUPPORTED_REGIONAL_TIME_ZONES } from "@/lib/regional";

const optionalIsoDate = z
  .string()
  .trim()
  .max(10)
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Use a valid YYYY-MM-DD date.",
  });

function validateTripDateOrder(
  value: { startDate: string; endDate: string },
  context: { addIssue: (issue: { code: "custom"; path: string[]; message: string }) => void },
) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "Trip end date cannot be before the start date.",
    });
  }
}

export const uuidSchema = z.string().uuid();

export const createTripSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    baseCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    budget: z.coerce.number().min(0).max(1_000_000_000).default(0),
    startDate: optionalIsoDate.optional().default(""),
    endDate: optionalIsoDate.optional().default(""),
  })
  .superRefine(validateTripDateOrder);

export const updateTripSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    budget: z.coerce.number().min(0).max(1_000_000_000),
    startDate: optionalIsoDate.optional().default(""),
    endDate: optionalIsoDate.optional().default(""),
  })
  .superRefine(validateTripDateOrder);

export const createCountrySchema = z.object({
  tripId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  defaultExchangeRate: z.coerce.number().positive().max(1_000_000),
  fxRateDate: z.string().trim().max(20).optional().default(""),
  fxRateProvider: z.string().trim().max(120).optional().default("Manual"),
});

export const createCountriesBulkSchema = z.object({
  countries: z
    .array(
      createCountrySchema.omit({
        tripId: true,
      }),
    )
    .min(1)
    .max(20),
});

export const updateCountrySchema = z.object({
  defaultExchangeRate: z.coerce.number().positive().max(1_000_000),
});

export const assignmentSchema = z.object({
  countryId: uuidSchema,
  userId: z.string().min(1),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
  role: z.enum(["user", "admin"]).default("user"),
});

export const resetUserPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

export const adminUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "admin"]),
});

export const profilePreferencesSchema = z.object({
  name: z.string().trim().min(2).max(100),
  avatarColor: z.enum([
    "teal",
    "amber",
    "ocean",
    "coral",
    "violet",
    "forest",
    "rose",
    "slate",
  ]),
  locale: z.enum(SUPPORTED_REGIONAL_LOCALES).default("en-MY"),
  timeZone: z.enum(SUPPORTED_REGIONAL_TIME_ZONES).default("Asia/Kuala_Lumpur"),
  avatarIcon: z.enum([
    "initial",
    "plane",
    "meal",
    "pin",
    "luggage",
    "palm",
    "coffee",
    "camera",
  ]),
});

const receiptReferenceSchema = z.union([
  z.string().url().max(4096),
  z
    .string()
    .max(900_000)
    .regex(
      /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/,
      "Invalid stored receipt image.",
    ),
  z.literal(""),
]);

const optionalPositiveMoneySchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  if (
    value === 0 ||
    (typeof value === "string" &&
      value.trim() !== "" &&
      Number(value.trim()) === 0)
  ) {
    return null;
  }

  return value;
}, z.coerce.number().positive().max(1_000_000_000).nullable());

export const expenseSchema = z.object({
  clientRequestId: uuidSchema.optional(),
  countryId: uuidSchema,
  expenseDate: z.string().min(10).max(10),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(250),
  transactionCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  transactionAmount: z.coerce.number().positive().max(1_000_000_000),
  exchangeRate: z.coerce.number().positive().max(1_000_000),
  rateType: z.enum(["DEFAULT", "CASH_EXCHANGE", "CREDIT_CARD", "MANUAL"]),
  actualConvertedAmount: optionalPositiveMoneySchema.optional(),
  paidByUserId: z.string().min(1),
  payers: z
    .array(
      z.object({
        userId: z.string().min(1),
        value: z.coerce.number().positive().max(1_000_000_000),
      }),
    )
    .max(30)
    .optional()
    .default([]),
  paymentMethod: z.string().trim().max(100).optional().default(""),
  receiptUrl: receiptReferenceSchema.optional().default(""),
  receiptConfidence: z.coerce.number().int().min(0).max(100).optional().nullable(),
  receiptReviewStatus: z.enum(["NOT_REQUIRED", "NEEDS_REVIEW", "REVIEWED"]).optional().default("NOT_REQUIRED"),
  notes: z.string().trim().max(1000).optional().default(""),
  allowDuplicate: z.coerce.boolean().optional().default(false),
  itemization: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    transactionAmount: z.coerce.number().positive().max(1_000_000_000),
    assigneeUserIds: z.array(z.string().min(1)).min(1).max(30),
  })).max(50).optional().default([]),
  splitMode: z.enum(["EQUAL", "PERCENTAGE", "SHARES", "EXACT"]),
  splits: z
    .array(
      z.object({
        userId: z.string().min(1),
        value: z.coerce.number().min(0).max(1_000_000_000),
      }),
    )
    .min(1),
});

export const expenseUpdateSchema = expenseSchema.extend({
  expectedUpdatedAt: z.string().trim().min(10).max(80).optional(),
});

export const travelItemSchema = z.object({
  countryId: uuidSchema,
  itemType: z.enum(["ITINERARY", "PLACE", "FOOD", "SHOPPING", "CHECKLIST", "PACKING"]),
  title: z.string().trim().min(1).max(250),
  itemDate: z.string().optional().default(""),
  itemTime: z.string().trim().max(30).optional().default(""),
  area: z.string().trim().max(120).optional().default(""),
  subtype: z.string().trim().max(100).optional().default(""),
  priority: z.string().trim().max(50).optional().default(""),
  status: z.string().trim().max(50).optional().default(""),
  ownerUserId: z.string().optional().default(""),
  estimatedCost: z.union([z.coerce.number().min(0), z.literal(""), z.null()]).optional(),
  quantity: z.union([z.coerce.number().min(0), z.literal(""), z.null()]).optional(),
  provider: z.string().trim().max(160).optional().default(""),
  confirmationNo: z.string().trim().max(100).optional().default(""),
  linkUrl: z.union([z.string().url(), z.literal("")]).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(100_000).optional().default(0),
  durationMinutes: z.union([z.coerce.number().int().min(1).max(1440), z.literal(""), z.null()]).optional(),
});

export const travelItemUpdateSchema = travelItemSchema.extend({
  expectedUpdatedAt: z.string().trim().min(10).max(80).optional(),
});

export const locationSchema = z.object({
  countryId: uuidSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(100_000).optional(),
});


export const settlementActionSchema = z.object({
  countryId: uuidSchema,
  counterpartyUserId: z.string().min(1),
  action: z.enum(["MARK_PAID", "MARK_RECEIVED"]),
  amount: z.coerce.number().positive().max(1_000_000_000).optional(),
});

export const expenseCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

export const splitPresetSchema = z.object({
  tripId: uuidSchema,
  name: z.string().trim().min(1).max(80),
  splitMode: z.enum(["EQUAL", "PERCENTAGE", "SHARES", "EXACT"]),
  shares: z.array(z.object({
    userId: z.string().min(1),
    value: z.coerce.number().min(0).max(1_000_000_000),
  })).min(1).max(30),
});

export const categoryBudgetSchema = z.object({
  tripId: uuidSchema,
  category: z.string().trim().min(1).max(80),
  amount: z.coerce.number().min(0).max(1_000_000_000),
});

export const plannerReorderSchema = z.object({
  countryId: uuidSchema,
  itemDate: z.string().max(10).optional().default(""),
  itemIds: z.array(uuidSchema).min(1).max(200),
});


export const selfServiceTripSchema = z.object({
  name: z.string().trim().min(2).max(120),
  baseCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((value) =>
      value.toUpperCase(),
    ),
  startDate: optionalIsoDate.optional().default(""),
  endDate: optionalIsoDate.optional().default(""),
  firstCountry: z.object({
    code: z
      .string()
      .trim()
      .length(2)
      .transform((value) =>
        value.toUpperCase(),
      ),
    defaultExchangeRate: z.coerce
      .number()
      .positive()
      .max(1_000_000_000),
    fxRateDate: z
      .string()
      .optional()
      .default(""),
    fxRateProvider: z
      .string()
      .trim()
      .max(120)
      .optional()
      .default(""),
  }),
}).superRefine(validateTripDateOrder);

export const selfServiceTripUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    startDate: optionalIsoDate.optional().default(""),
    endDate: optionalIsoDate.optional().default(""),
  })
  .superRefine(validateTripDateOrder);

export const personalTripBudgetSchema = z.object({
  tripId: uuidSchema,
  amount: z.coerce
    .number()
    .positive()
    .max(1_000_000_000),
});

export const tripCountryMemberSchema = z.object({
  userId: z.string().min(1),
});

export const publicFxQuerySchema = z.object({
  base: z
    .string()
    .trim()
    .length(3)
    .transform((value) =>
      value.toUpperCase(),
    ),
  quote: z
    .string()
    .trim()
    .length(3)
    .transform((value) =>
      value.toUpperCase(),
    ),
});


export const deleteTripSchema = z.object({
  confirmationName: z
    .string()
    .trim()
    .min(1)
    .max(120),
});
