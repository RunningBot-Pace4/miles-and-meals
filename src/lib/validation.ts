import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const createTripSchema = z.object({
  name: z.string().trim().min(2).max(120),
  baseCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  budget: z.coerce.number().min(0).max(1_000_000_000),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
});

export const createCountrySchema = z.object({
  tripId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
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
});

export const resetUserPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

export const profilePreferencesSchema = z.object({
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

export const expenseSchema = z.object({
  countryId: uuidSchema,
  expenseDate: z.string().min(10).max(10),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(250),
  transactionCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  transactionAmount: z.coerce.number().positive().max(1_000_000_000),
  exchangeRate: z.coerce.number().positive().max(1_000_000),
  rateType: z.enum(["DEFAULT", "CASH_EXCHANGE", "CREDIT_CARD", "MANUAL"]),
  actualConvertedAmount: z.union([z.coerce.number().min(0), z.literal(""), z.null()]).optional(),
  paidByUserId: z.string().min(1),
  paymentMethod: z.string().trim().max(100).optional().default(""),
  receiptUrl: z.union([z.string().url(), z.literal("")]).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  splitMode: z.enum(["EQUAL", "PERCENTAGE", "EXACT"]),
  splits: z
    .array(
      z.object({
        userId: z.string().min(1),
        value: z.coerce.number().min(0).max(1_000_000_000),
      }),
    )
    .min(1),
});

export const travelItemSchema = z.object({
  countryId: uuidSchema,
  itemType: z.enum(["ITINERARY", "PLACE", "FOOD", "SHOPPING", "BOOKING"]),
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
});

export const locationSchema = z.object({
  countryId: uuidSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(100_000).optional(),
});
