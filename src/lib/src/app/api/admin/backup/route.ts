import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  expenseItemAssignments,
  expenseItems,
  expenseComments,
  expensePayers,
  expenseSplits,
  expenses,
  journeys,
  settlements,
  travelItems,
  tripInboxItems,
  tripBudgets,
  tripCategoryBudgets,
  tripDocuments,
  tripEmergencyContacts,
  tripMemories,
  tripMemberPermissions,
  tripMembers,
  splitPresets,
  trips,
  user,
} from "@/db/schema";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";

export const runtime = "nodejs";

const BACKUP_FORMAT =
  "miles-and-meals-travel-backup";
const BACKUP_VERSION = 3;
const RESTORE_CONFIRMATION =
  "RESTORE TRAVEL DATA";

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.union([z.literal(1), z.literal(2), z.literal(BACKUP_VERSION)]),
  exportedAt: z.string(),
  data: z.object({
    journeys: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    trips: z.array(z.record(z.string(), z.unknown())),
    tripMembers: z.array(z.record(z.string(), z.unknown())),
    tripMemberPermissions: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    tripDocuments: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    tripEmergencyContacts: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    tripMemories: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    tripBudgets: z
      .array(
        z.record(
          z.string(),
          z.unknown(),
        ),
      )
      .optional()
      .default([]),
    tripCategoryBudgets: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    countries: z.array(z.record(z.string(), z.unknown())),
    countryMembers: z.array(z.record(z.string(), z.unknown())),
    expenses: z.array(z.record(z.string(), z.unknown())),
    expenseSplits: z.array(z.record(z.string(), z.unknown())),
    expensePayers: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    expenseComments: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    splitPresets: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    expenseItems: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    expenseItemAssignments: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    settlements: z.array(z.record(z.string(), z.unknown())),
    travelItems: z.array(z.record(z.string(), z.unknown())),
    tripInboxItems: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  }),
});

type Backup = z.infer<
  typeof backupSchema
>;

const postSchema = z.object({
  mode: z.enum([
    "preview",
    "restore",
  ]),
  confirmation:
    z.string().optional(),
  backup: z.unknown(),
});

type SqlValue =
  | string
  | number
  | boolean
  | Date
  | null;

function value(
  row: Record<string, unknown>,
  key: string,
): SqlValue {
  const raw = row[key];

  if (
    raw === null ||
    raw === undefined
  ) {
    return null;
  }

  if (
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean" ||
    raw instanceof Date
  ) {
    return raw;
  }

  return String(raw);
}

function requiredString(
  row: Record<string, unknown>,
  key: string,
  errors: string[],
  label: string,
): string {
  const result = value(
    row,
    key,
  );

  if (
    typeof result !== "string" ||
    !result.trim()
  ) {
    errors.push(
      `${label}.${key} is missing.`,
    );
    return "";
  }

  return result;
}

function optionalString(
  row: Record<string, unknown>,
  key: string,
): string | null {
  const result = value(
    row,
    key,
  );

  return typeof result === "string"
    ? result
    : null;
}

function requiredUserIds(
  backup: Backup,
): string[] {
  const ids = new Set<string>();

  function add(
    row: Record<string, unknown>,
    key: string,
  ) {
    const candidate =
      row[key];

    if (
      typeof candidate ===
        "string" &&
      candidate
    ) {
      ids.add(candidate);
    }
  }

  for (const row of backup.data.journeys) {
    add(row, "createdBy");
  }

  for (const row of backup.data.trips) {
    add(row, "createdBy");
    add(row, "financialClosedBy");
  }

  for (
    const row of
      backup.data.tripMembers
  ) {
    add(row, "userId");
  }

  for (const row of backup.data.tripMemberPermissions) {
    add(row, "userId");
    add(row, "updatedBy");
  }
  for (const row of backup.data.tripDocuments) add(row, "createdBy");
  for (const row of backup.data.tripEmergencyContacts) add(row, "createdBy");
  for (const row of backup.data.tripMemories) add(row, "createdBy");

  for (const row of backup.data.tripCategoryBudgets) add(row, "createdBy");

  for (
    const row of
      backup.data.tripBudgets
  ) {
    add(row, "userId");
  }

  for (const row of backup.data.expensePayers) add(row, "userId");
  for (const row of backup.data.expenseComments) add(row, "userId");
  for (const row of backup.data.splitPresets) add(row, "createdBy");

  for (
    const row of
      backup.data.countryMembers
  ) {
    add(row, "userId");
  }

  for (
    const row of
      backup.data.expenses
  ) {
    add(row, "paidByUserId");
    add(row, "createdBy");
  }

  for (
    const row of
      backup.data.expenseSplits
  ) {
    add(row, "userId");
  }

  for (const row of backup.data.expenseItemAssignments) {
    add(row, "userId");
  }

  for (
    const row of
      backup.data.settlements
  ) {
    add(row, "fromUserId");
    add(row, "toUserId");
    add(row, "initiatedBy");
    add(row, "confirmedBy");
  }

  for (
    const row of
      backup.data.travelItems
  ) {
    add(row, "ownerUserId");
    add(row, "createdBy");
  }

  for (const row of backup.data.tripInboxItems) {
    add(row, "createdBy");
  }

  return [...ids];
}

async function validateBackup(
  backup: Backup,
) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const journeyIds = new Set(
    backup.data.journeys.map((row, index) =>
      requiredString(row, "id", errors, `journeys[${index}]`),
    ),
  );
  const tripIds = new Set(
    backup.data.trips.map(
      (row, index) =>
        requiredString(
          row,
          "id",
          errors,
          `trips[${index}]`,
        ),
    ),
  );
  const countryIds = new Set(
    backup.data.countries.map(
      (row, index) =>
        requiredString(
          row,
          "id",
          errors,
          `countries[${index}]`,
        ),
    ),
  );
  const countryTripIds =
    new Map<string, string>();

  for (const [index, row] of backup.data.trips.entries()) {
    const journeyId = optionalString(row, "journeyId");
    if (journeyId && !journeyIds.has(journeyId)) {
      errors.push(`trips[${index}] references a missing Journey.`);
    }
  }

  for (
    const [index, row]
    of backup.data.tripBudgets.entries()
  ) {
    const tripId =
      requiredString(
        row,
        "tripId",
        errors,
        `tripBudgets[${index}]`,
      );

    if (
      tripId &&
      !tripIds.has(tripId)
    ) {
      errors.push(
        `tripBudgets[${index}] references a missing trip.`,
      );
    }

    const amount = Number(
      value(
        row,
        "amount",
      ),
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      errors.push(
        `tripBudgets[${index}] has an invalid personal budget amount.`,
      );
    }
  }

  for (
    const [index, row]
    of backup.data.countries.entries()
  ) {
    const id =
      requiredString(
        row,
        "id",
        errors,
        `countries[${index}]`,
      );
    const tripId =
      requiredString(
        row,
        "tripId",
        errors,
        `countries[${index}]`,
      );

    if (id && tripId) {
      countryTripIds.set(
        id,
        tripId,
      );
    }
  }

  for (
    const [index, row]
    of backup.data.countryMembers.entries()
  ) {
    const countryId =
      requiredString(
        row,
        "countryId",
        errors,
        `countryMembers[${index}]`,
      );

    if (
      countryId &&
      !countryIds.has(
        countryId,
      )
    ) {
      errors.push(
        `countryMembers[${index}] references a missing country.`,
      );
    }
  }

  const expenseIds = new Set(
    backup.data.expenses.map(
      (row, index) =>
        requiredString(
          row,
          "id",
          errors,
          `expenses[${index}]`,
        ),
    ),
  );

  for (
    const [index, row]
    of backup.data.tripMembers.entries()
  ) {
    const tripId =
      requiredString(
        row,
        "tripId",
        errors,
        `tripMembers[${index}]`,
      );

    if (
      tripId &&
      !tripIds.has(tripId)
    ) {
      errors.push(
        `tripMembers[${index}] references a missing trip.`,
      );
    }
  }

  for (
    const [index, row]
    of backup.data.countries.entries()
  ) {
    const tripId =
      requiredString(
        row,
        "tripId",
        errors,
        `countries[${index}]`,
      );

    if (
      tripId &&
      !tripIds.has(tripId)
    ) {
      errors.push(
        `countries[${index}] references a missing trip.`,
      );
    }
  }

  for (
    const [index, row]
    of backup.data.expenses.entries()
  ) {
    const tripId =
      requiredString(
        row,
        "tripId",
        errors,
        `expenses[${index}]`,
      );
    const countryId =
      requiredString(
        row,
        "countryId",
        errors,
        `expenses[${index}]`,
      );

    if (
      tripId &&
      !tripIds.has(tripId)
    ) {
      errors.push(
        `expenses[${index}] references a missing trip.`,
      );
    }

    if (
      countryId &&
      !countryIds.has(
        countryId,
      )
    ) {
      errors.push(
        `expenses[${index}] references a missing country.`,
      );
    }

    if (
      tripId &&
      countryId &&
      countryTripIds.get(
        countryId,
      ) !== tripId
    ) {
      errors.push(
        `expenses[${index}] trip does not match its country.`,
      );
    }
  }

  for (
    const [index, row]
    of backup.data.expenseSplits.entries()
  ) {
    const expenseId =
      requiredString(
        row,
        "expenseId",
        errors,
        `expenseSplits[${index}]`,
      );

    if (
      expenseId &&
      !expenseIds.has(
        expenseId,
      )
    ) {
      errors.push(
        `expenseSplits[${index}] references a missing expense.`,
      );
    }
  }

  const expenseItemIds = new Set(
    backup.data.expenseItems.map((row, index) => {
      const id = requiredString(row, "id", errors, `expenseItems[${index}]`);
      const expenseId = requiredString(row, "expenseId", errors, `expenseItems[${index}]`);
      if (expenseId && !expenseIds.has(expenseId)) {
        errors.push(`expenseItems[${index}] references a missing expense.`);
      }
      return id;
    }),
  );

  for (const [index, row] of backup.data.expenseItemAssignments.entries()) {
    const itemId = requiredString(row, "itemId", errors, `expenseItemAssignments[${index}]`);
    if (itemId && !expenseItemIds.has(itemId)) {
      errors.push(`expenseItemAssignments[${index}] references a missing expense item.`);
    }
  }

  for (
    const [index, row]
    of backup.data.settlements.entries()
  ) {
    const tripId =
      requiredString(
        row,
        "tripId",
        errors,
        `settlements[${index}]`,
      );
    const countryId =
      requiredString(
        row,
        "countryId",
        errors,
        `settlements[${index}]`,
      );

    if (
      tripId &&
      !tripIds.has(tripId)
    ) {
      errors.push(
        `settlements[${index}] references a missing trip.`,
      );
    }

    if (
      countryId &&
      !countryIds.has(
        countryId,
      )
    ) {
      errors.push(
        `settlements[${index}] references a missing country.`,
      );
    }

    if (
      tripId &&
      countryId &&
      countryTripIds.get(
        countryId,
      ) !== tripId
    ) {
      errors.push(
        `settlements[${index}] trip does not match its country.`,
      );
    }
  }

  for (
    const [index, row]
    of backup.data.travelItems.entries()
  ) {
    const countryId =
      requiredString(
        row,
        "countryId",
        errors,
        `travelItems[${index}]`,
      );

    if (
      countryId &&
      !countryIds.has(
        countryId,
      )
    ) {
      errors.push(
        `travelItems[${index}] references a missing country.`,
      );
    }
  }

  for (const [index, row] of backup.data.tripInboxItems.entries()) {
    const tripId = requiredString(row, "tripId", errors, `tripInboxItems[${index}]`);
    const countryId = requiredString(row, "countryId", errors, `tripInboxItems[${index}]`);
    if (tripId && !tripIds.has(tripId)) errors.push(`tripInboxItems[${index}] references a missing trip.`);
    if (countryId && !countryIds.has(countryId)) errors.push(`tripInboxItems[${index}] references a missing country.`);
  }

  for (const [collection, rows] of [
    ["tripMemberPermissions", backup.data.tripMemberPermissions],
    ["tripDocuments", backup.data.tripDocuments],
    ["tripEmergencyContacts", backup.data.tripEmergencyContacts],
    ["tripMemories", backup.data.tripMemories],
  ] as const) {
    rows.forEach((row, index) => {
      const tripId = requiredString(row, "tripId", errors, `${collection}[${index}]`);
      if (tripId && !tripIds.has(tripId)) errors.push(`${collection}[${index}] references a missing trip.`);
    });
  }

  const neededUserIds =
    requiredUserIds(backup);
  const currentUsers =
    await db
      .select({
        id: user.id,
      })
      .from(user);
  const currentUserIds =
    new Set(
      currentUsers.map(
        (item) => item.id,
      ),
    );

  const missingUsers =
    neededUserIds.filter(
      (id) =>
        !currentUserIds.has(id),
    );

  if (missingUsers.length) {
    errors.push(
      `Backup references ${missingUsers.length} user account(s) that do not exist in the current login database.`,
    );
  }

  const embeddedReceiptCount =
    backup.data.expenses.filter(
      (row) =>
        typeof row.receiptUrl ===
          "string" &&
        row.receiptUrl.startsWith(
          "data:image/",
        ),
    ).length;

  if (embeddedReceiptCount > 0) {
    warnings.push(
      `${embeddedReceiptCount} embedded receipt image(s) will be restored. Large backups can take longer to upload.`,
    );
  }

  return {
    valid:
      errors.length === 0,
    errors,
    warnings,
    counts: {
      journeys: backup.data.journeys.length,
      trips:
        backup.data.trips.length,
      tripMembers:
        backup.data.tripMembers
          .length,
      tripMemberPermissions: backup.data.tripMemberPermissions.length,
      tripDocuments: backup.data.tripDocuments.length,
      emergencyContacts: backup.data.tripEmergencyContacts.length,
      tripMemories: backup.data.tripMemories.length,
      personalBudgets:
        backup.data.tripBudgets
          .length,
      categoryBudgets: backup.data.tripCategoryBudgets.length,
      countries:
        backup.data.countries
          .length,
      countryMembers:
        backup.data.countryMembers
          .length,
      expenses:
        backup.data.expenses.length,
      expenseSplits:
        backup.data.expenseSplits
          .length,
      expensePayers: backup.data.expensePayers.length,
      expenseComments: backup.data.expenseComments.length,
      splitPresets: backup.data.splitPresets.length,
      expenseItems: backup.data.expenseItems.length,
      itemAssignments: backup.data.expenseItemAssignments.length,
      settlements:
        backup.data.settlements
          .length,
      plannerItems:
        backup.data.travelItems
          .length,
      inboxItems: backup.data.tripInboxItems.length,
    },
  };
}

function timestamp(
  row: Record<string, unknown>,
  key: string,
): Date | null {
  const raw = optionalString(
    row,
    key,
  );

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? null
    : parsed;
}

async function restoreBackup(
  backup: Backup,
): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured.",
    );
  }

  const sql = neon(databaseUrl);
  const queries = [
    sql`DELETE FROM trips`,
    sql`DELETE FROM journeys`,
  ];

  for (const row of backup.data.journeys) {
    queries.push(sql`
      INSERT INTO journeys (id, name, start_date, end_date, created_by, created_at, updated_at)
      VALUES (
        ${value(row, "id")}, ${value(row, "name")}, ${value(row, "startDate")}, ${value(row, "endDate")},
        ${value(row, "createdBy")}, ${timestamp(row, "createdAt") ?? new Date()}, ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.trips) {
    queries.push(sql`
      INSERT INTO trips (
        id,
        journey_id,
        name,
        base_currency,
        budget,
        start_date,
        end_date,
        financial_status,
        financial_version,
        financial_closed_at,
        financial_closed_by,
        financial_snapshot,
        created_by,
        created_at
      ) VALUES (
        ${value(row, "id")},
        ${value(row, "journeyId")},
        ${value(row, "name")},
        ${value(row, "baseCurrency")},
        ${value(row, "budget")},
        ${value(row, "startDate")},
        ${value(row, "endDate")},
        ${value(row, "financialStatus") ?? "OPEN"},
        ${value(row, "financialVersion") ?? 0},
        ${timestamp(row, "financialClosedAt")},
        ${value(row, "financialClosedBy")},
        ${value(row, "financialSnapshot")},
        ${value(row, "createdBy")},
        ${timestamp(row, "createdAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.tripMemberPermissions) {
    queries.push(sql`
      INSERT INTO trip_member_permissions (
        trip_id, user_id, can_edit_plan, can_add_expenses, can_view_documents,
        can_add_memories, updated_by, updated_at
      ) VALUES (
        ${value(row, "tripId")}, ${value(row, "userId")}, ${value(row, "canEditPlan") ?? true},
        ${value(row, "canAddExpenses") ?? true}, ${value(row, "canViewDocuments") ?? true},
        ${value(row, "canAddMemories") ?? true}, ${value(row, "updatedBy")},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.tripCategoryBudgets) {
    queries.push(sql`
      INSERT INTO trip_category_budgets (trip_id, category, amount, created_by, created_at, updated_at)
      VALUES (
        ${value(row, "tripId")}, ${value(row, "category")}, ${value(row, "amount")},
        ${value(row, "createdBy")}, ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.splitPresets) {
    queries.push(sql`
      INSERT INTO split_presets (id, trip_id, name, split_mode, shares_json, created_by, created_at)
      VALUES (
        ${value(row, "id")}, ${value(row, "tripId")}, ${value(row, "name")},
        ${value(row, "splitMode") ?? "SHARES"}, ${value(row, "sharesJson")},
        ${value(row, "createdBy")}, ${timestamp(row, "createdAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.tripDocuments) {
    queries.push(sql`
      INSERT INTO trip_documents (
        id, trip_id, title, document_type, document_data, external_url, expiry_date,
        visibility, created_by, created_at, updated_at
      ) VALUES (
        ${value(row, "id")}, ${value(row, "tripId")}, ${value(row, "title")},
        ${value(row, "documentType") ?? "OTHER"}, ${value(row, "documentData")},
        ${value(row, "externalUrl")}, ${value(row, "expiryDate")}, ${value(row, "visibility") ?? "TRIP"},
        ${value(row, "createdBy")}, ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.tripEmergencyContacts) {
    queries.push(sql`
      INSERT INTO trip_emergency_contacts (
        id, trip_id, label, contact_name, phone, notes, created_by, created_at, updated_at
      ) VALUES (
        ${value(row, "id")}, ${value(row, "tripId")}, ${value(row, "label")},
        ${value(row, "contactName")}, ${value(row, "phone")}, ${value(row, "notes")},
        ${value(row, "createdBy")}, ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.tripMemories) {
    queries.push(sql`
      INSERT INTO trip_memories (
        id, trip_id, title, story, place, occurred_on, photo_data, created_by, created_at, updated_at
      ) VALUES (
        ${value(row, "id")}, ${value(row, "tripId")}, ${value(row, "title")},
        ${value(row, "story")}, ${value(row, "place")}, ${value(row, "occurredOn")},
        ${value(row, "photoData")}, ${value(row, "createdBy")},
        ${timestamp(row, "createdAt") ?? new Date()}, ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (
    const row of
      backup.data.tripMembers
  ) {
    queries.push(sql`
      INSERT INTO trip_members (
        trip_id,
        user_id,
        role,
        created_at
      ) VALUES (
        ${value(row, "tripId")},
        ${value(row, "userId")},
        ${value(row, "role")},
        ${timestamp(row, "createdAt") ?? new Date()}
      )
    `);
  }

  for (
    const row of
      backup.data.tripBudgets
  ) {
    queries.push(sql`
      INSERT INTO trip_budgets (
        trip_id,
        user_id,
        amount,
        created_at,
        updated_at
      ) VALUES (
        ${value(row, "tripId")},
        ${value(row, "userId")},
        ${value(row, "amount")},
        ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (
    const row of
      backup.data.countries
  ) {
    queries.push(sql`
      INSERT INTO countries (
        id,
        trip_id,
        name,
        code,
        currency_code,
        default_exchange_rate,
        fx_rate_date,
        fx_rate_provider,
        created_at
      ) VALUES (
        ${value(row, "id")},
        ${value(row, "tripId")},
        ${value(row, "name")},
        ${value(row, "code")},
        ${value(row, "currencyCode")},
        ${value(row, "defaultExchangeRate")},
        ${value(row, "fxRateDate")},
        ${value(row, "fxRateProvider")},
        ${timestamp(row, "createdAt") ?? new Date()}
      )
    `);
  }

  for (
    const row of
      backup.data.countryMembers
  ) {
    queries.push(sql`
      INSERT INTO country_members (
        country_id,
        user_id,
        created_at
      ) VALUES (
        ${value(row, "countryId")},
        ${value(row, "userId")},
        ${timestamp(row, "createdAt") ?? new Date()}
      )
    `);
  }

  for (
    const row of
      backup.data.expenses
  ) {
    queries.push(sql`
      INSERT INTO expenses (
        id,
        trip_id,
        country_id,
        expense_date,
        category,
        description,
        transaction_currency,
        transaction_amount,
        exchange_rate,
        rate_type,
        base_currency,
        converted_amount,
        actual_converted_amount,
        split_mode,
        paid_by_user_id,
        payment_method,
        receipt_url,
        receipt_review_status,
        receipt_confidence,
        receipt_reviewed_at,
        notes,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        ${value(row, "id")},
        ${value(row, "tripId")},
        ${value(row, "countryId")},
        ${value(row, "expenseDate")},
        ${value(row, "category")},
        ${value(row, "description")},
        ${value(row, "transactionCurrency")},
        ${value(row, "transactionAmount")},
        ${value(row, "exchangeRate")},
        ${value(row, "rateType")},
        ${value(row, "baseCurrency")},
        ${value(row, "convertedAmount")},
        ${value(row, "actualConvertedAmount")},
        ${value(row, "splitMode")},
        ${value(row, "paidByUserId")},
        ${value(row, "paymentMethod")},
        ${value(row, "receiptUrl")},
        ${value(row, "receiptReviewStatus") ?? "NOT_REQUIRED"},
        ${value(row, "receiptConfidence")},
        ${timestamp(row, "receiptReviewedAt")},
        ${value(row, "notes")},
        ${value(row, "createdBy")},
        ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (
    const row of
      backup.data.expenseSplits
  ) {
    queries.push(sql`
      INSERT INTO expense_splits (
        expense_id,
        user_id,
        share_amount_base
      ) VALUES (
        ${value(row, "expenseId")},
        ${value(row, "userId")},
        ${value(row, "shareAmountBase")}
      )
    `);
  }

  for (const row of backup.data.expensePayers) {
    queries.push(sql`
      INSERT INTO expense_payers (expense_id, user_id, amount_base)
      VALUES (${value(row, "expenseId")}, ${value(row, "userId")}, ${value(row, "amountBase")})
    `);
  }

  for (const row of backup.data.expenseComments) {
    queries.push(sql`
      INSERT INTO expense_comments (id, expense_id, user_id, body, created_at, updated_at)
      VALUES (
        ${value(row, "id")}, ${value(row, "expenseId")}, ${value(row, "userId")},
        ${value(row, "body")}, ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.expenseItems) {
    queries.push(sql`
      INSERT INTO expense_items (id, expense_id, title, transaction_amount, base_amount, created_at)
      VALUES (
        ${value(row, "id")}, ${value(row, "expenseId")}, ${value(row, "title")},
        ${value(row, "transactionAmount")}, ${value(row, "baseAmount")}, ${timestamp(row, "createdAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.expenseItemAssignments) {
    queries.push(sql`
      INSERT INTO expense_item_assignments (item_id, user_id, share_amount_base)
      VALUES (${value(row, "itemId")}, ${value(row, "userId")}, ${value(row, "shareAmountBase")})
    `);
  }

  for (
    const row of
      backup.data.settlements
  ) {
    queries.push(sql`
      INSERT INTO settlements (
        id,
        trip_id,
        country_id,
        from_user_id,
        to_user_id,
        amount,
        currency,
        status,
        initiated_by,
        confirmed_by,
        sent_at,
        confirmed_at,
        created_at,
        updated_at
      ) VALUES (
        ${value(row, "id")},
        ${value(row, "tripId")},
        ${value(row, "countryId")},
        ${value(row, "fromUserId")},
        ${value(row, "toUserId")},
        ${value(row, "amount")},
        ${value(row, "currency")},
        ${value(row, "status")},
        ${value(row, "initiatedBy")},
        ${value(row, "confirmedBy")},
        ${timestamp(row, "sentAt") ?? new Date()},
        ${timestamp(row, "confirmedAt")},
        ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (
    const row of
      backup.data.travelItems
  ) {
    queries.push(sql`
      INSERT INTO travel_items (
        id,
        country_id,
        item_type,
        title,
        item_date,
        item_time,
        area,
        subtype,
        priority,
        status,
        owner_user_id,
        estimated_cost,
        quantity,
        provider,
        confirmation_no,
        link_url,
        notes,
        sort_order,
        duration_minutes,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        ${value(row, "id")},
        ${value(row, "countryId")},
        ${value(row, "itemType")},
        ${value(row, "title")},
        ${value(row, "itemDate")},
        ${value(row, "itemTime")},
        ${value(row, "area")},
        ${value(row, "subtype")},
        ${value(row, "priority")},
        ${value(row, "status")},
        ${value(row, "ownerUserId")},
        ${value(row, "estimatedCost")},
        ${value(row, "quantity")},
        ${value(row, "provider")},
        ${value(row, "confirmationNo")},
        ${value(row, "linkUrl")},
        ${value(row, "notes")},
        ${value(row, "sortOrder") ?? 0},
        ${value(row, "durationMinutes")},
        ${value(row, "createdBy")},
        ${timestamp(row, "createdAt") ?? new Date()},
        ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  for (const row of backup.data.tripInboxItems) {
    queries.push(sql`
      INSERT INTO trip_inbox_items (
        id, trip_id, country_id, source_type, source_name, kind, title, provider, confirmation_no,
        booking_date, booking_time, raw_text, status, linked_travel_item_id, created_by, created_at, updated_at
      ) VALUES (
        ${value(row, "id")}, ${value(row, "tripId")}, ${value(row, "countryId")}, ${value(row, "sourceType")},
        ${value(row, "sourceName")}, ${value(row, "kind")}, ${value(row, "title")}, ${value(row, "provider")},
        ${value(row, "confirmationNo")}, ${value(row, "bookingDate")}, ${value(row, "bookingTime")}, ${value(row, "rawText")},
        ${value(row, "status")}, ${value(row, "linkedTravelItemId")}, ${value(row, "createdBy")},
        ${timestamp(row, "createdAt") ?? new Date()}, ${timestamp(row, "updatedAt") ?? new Date()}
      )
    `);
  }

  await sql.transaction(queries);
}

async function requireAdmin() {
  const session =
    await getSession();

  if (
    !session ||
    !isSystemAdmin(
      session.user.role,
    )
  ) {
    return null;
  }

  return session;
}

export async function GET() {
  const session =
    await requireAdmin();

  if (!session) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const [
    journeyRows,
    tripRows,
    tripMemberRows,
    tripMemberPermissionRows,
    tripDocumentRows,
    emergencyContactRows,
    tripMemoryRows,
    tripBudgetRows,
    tripCategoryBudgetRows,
    countryRows,
    countryMemberRows,
    expenseRows,
    splitRows,
    payerRows,
    commentRows,
    splitPresetRows,
    settlementRows,
    plannerRows,
    expenseItemRows,
    expenseItemAssignmentRows,
  ] = await Promise.all([
    db.select().from(journeys),
    db.select().from(trips),
    db.select().from(tripMembers),
    db.select().from(tripMemberPermissions),
    db.select().from(tripDocuments),
    db.select().from(tripEmergencyContacts),
    db.select().from(tripMemories),
    db.select().from(tripBudgets),
    db.select().from(tripCategoryBudgets),
    db.select().from(countries),
    db.select().from(countryMembers),
    db.select().from(expenses),
    db.select().from(expenseSplits),
    db.select().from(expensePayers),
    db.select().from(expenseComments),
    db.select().from(splitPresets),
    db.select().from(settlements),
    db.select().from(travelItems),
    db.select().from(expenseItems),
    db.select().from(expenseItemAssignments),
  ]);

  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt:
      new Date().toISOString(),
    exportedBy: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    excludes: [
      "user",
      "session",
      "account",
      "verification",
      "login_audits",
      "user_preferences",
      "notification_preferences",
      "push_subscriptions",
      "notifications",
      "app_errors",
      "api_metrics",
      "product_events",
      "trip_invites",
    ],
    data: {
      journeys: journeyRows,
      trips: tripRows,
      tripMembers:
        tripMemberRows,
      tripMemberPermissions: tripMemberPermissionRows,
      tripDocuments: tripDocumentRows,
      tripEmergencyContacts: emergencyContactRows,
      tripMemories: tripMemoryRows,
      tripBudgets:
        tripBudgetRows,
      tripCategoryBudgets: tripCategoryBudgetRows,
      countries: countryRows,
      countryMembers:
        countryMemberRows,
      expenses: expenseRows,
      expenseSplits:
        splitRows,
      expensePayers: payerRows,
      expenseComments: commentRows,
      splitPresets: splitPresetRows,
      expenseItems: expenseItemRows,
      expenseItemAssignments: expenseItemAssignmentRows,
      settlements:
        settlementRows,
      travelItems:
        plannerRows,
    },
  };

  return new Response(
    JSON.stringify(
      backup,
      null,
      2,
    ),
    {
      headers: {
        "content-type":
          "application/json; charset=utf-8",
        "content-disposition":
          'attachment; filename="miles-and-meals-full-travel-backup.json"',
        "cache-control": "no-store",
      },
    },
  );
}

export async function POST(
  request: Request,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session =
    await requireAdmin();

  if (!session) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input = postSchema.parse(
      await request.json(),
    );
    const backup =
      backupSchema.parse(
        input.backup,
      );
    const preview =
      await validateBackup(
        backup,
      );

    if (
      input.mode === "preview"
    ) {
      return Response.json({
        ok: true,
        preview,
      });
    }

    if (!preview.valid) {
      return Response.json(
        {
          error:
            "Backup validation failed. Restore was not started.",
          preview,
        },
        { status: 400 },
      );
    }

    if (
      input.confirmation !==
      RESTORE_CONFIRMATION
    ) {
      return Response.json(
        {
          error:
            `Type ${RESTORE_CONFIRMATION} to confirm restore.`,
        },
        { status: 400 },
      );
    }

    await restoreBackup(backup);

    return Response.json({
      ok: true,
      restored:
        preview.counts,
      loginDataPreserved: true,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process backup.",
      },
      { status: 400 },
    );
  }
}
