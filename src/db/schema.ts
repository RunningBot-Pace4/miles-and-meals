import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Better Auth core tables plus Admin plugin fields.
 */
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    role: text("role").default("user"),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
  },
  (table) => [uniqueIndex("user_email_uq").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [
    uniqueIndex("session_token_uq").on(table.token),
    uniqueIndex("session_user_uq").on(table.userId),
  ],
);

export const loginAudits = pgTable(
  "login_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    signedInAt: timestamp("signed_in_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("login_audit_user_time_idx").on(
      table.userId,
      table.signedInAt,
    ),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  avatarColor: text("avatar_color").default("teal").notNull(),
  avatarIcon: text("avatar_icon").default("initial").notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  locale: text("locale").default("en-MY").notNull(),
  timeZone: text("time_zone").default("Asia/Kuala_Lumpur").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    paymentsEnabled: boolean("payments_enabled").default(true).notNull(),
    expensesEnabled: boolean("expenses_enabled").default(true).notNull(),
    plannerEnabled: boolean("planner_enabled").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("push_subscription_endpoint_uq").on(table.endpoint),
    index("push_subscription_user_idx").on(table.userId),
  ],
);

export const apiMetrics = pgTable(
  "api_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    route: text("route").notNull(),
    method: text("method").notNull(),
    durationMs: integer("duration_ms").notNull(),
    statusCode: integer("status_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("api_metric_time_idx").on(table.createdAt),
    index("api_metric_route_time_idx").on(
      table.route,
      table.createdAt,
    ),
  ],
);


export const productEvents = pgTable(
  "product_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventName: text("event_name").notNull(),
    route: text("route").notNull(),
    context: text("context"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_event_time_idx").on(table.createdAt),
    index("product_event_name_time_idx").on(
      table.eventName,
      table.createdAt,
    ),
  ],
);

export const appErrors = pgTable(
  "app_errors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    route: text("route"),
    message: text("message").notNull(),
    stack: text("stack"),
    digest: text("digest"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("app_error_time_idx").on(table.createdAt),
    index("app_error_user_time_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const journeys = pgTable(
  "journeys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("journey_creator_idx").on(table.createdBy),
  ],
);

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  journeyId: uuid("journey_id").references(() => journeys.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").default("MYR").notNull(),
  budget: numeric("budget", { precision: 18, scale: 2 }).default("0").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  financialStatus: text("financial_status").default("OPEN").notNull(),
  financialVersion: integer("financial_version").default(0).notNull(),
  financialClosedAt: timestamp("financial_closed_at", { withTimezone: true }),
  financialClosedBy: text("financial_closed_by").references(() => user.id, {
    onDelete: "set null",
  }),
  financialSnapshot: text("financial_snapshot"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("MEMBER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.userId] })],
);

export const tripBudgets = pgTable(
  "trip_budgets",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, {
        onDelete: "cascade",
      }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),
    amount: numeric("amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.tripId,
        table.userId,
      ],
    }),
    index("trip_budget_user_idx").on(
      table.userId,
    ),
  ],
);

export const countries = pgTable(
  "countries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    currencyCode: text("currency_code").notNull(),
    defaultExchangeRate: numeric("default_exchange_rate", {
      precision: 22,
      scale: 10,
    })
      .default("1")
      .notNull(),
    fxRateDate: date("fx_rate_date"),
    fxRateProvider: text("fx_rate_provider"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_trip_code_uq").on(table.tripId, table.code),
    index("country_trip_idx").on(table.tripId),
  ],
);

export const tripInvites = pgTable(
  "trip_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    useCount: integer("use_count").default(0).notNull(),
    maxUses: integer("max_uses").default(50).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("trip_invite_token_hash_uq").on(table.tokenHash),
    index("trip_invite_trip_idx").on(table.tripId),
  ],
);

export const countryMembers = pgTable(
  "country_members",
  {
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.countryId, table.userId] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url").default("/dashboard").notNull(),
    countryId: uuid("country_id").references(() => countries.id, {
      onDelete: "cascade",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notification_user_time_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("notification_user_read_idx").on(
      table.userId,
      table.readAt,
    ),
  ],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    tripId: uuid("trip_id").references(() => trips.id, {
      onDelete: "cascade",
    }),
    countryId: uuid("country_id").references(() => countries.id, {
      onDelete: "cascade",
    }),
    summary: text("summary").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_country_time_idx").on(
      table.countryId,
      table.createdAt,
    ),
    index("activity_trip_time_idx").on(
      table.tripId,
      table.createdAt,
    ),
    index("activity_actor_time_idx").on(
      table.actorUserId,
      table.createdAt,
    ),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    expenseDate: date("expense_date").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    transactionCurrency: text("transaction_currency").notNull(),
    transactionAmount: numeric("transaction_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    exchangeRate: numeric("exchange_rate", {
      precision: 22,
      scale: 10,
    }).notNull(),
    rateType: text("rate_type").default("DEFAULT").notNull(),
    baseCurrency: text("base_currency").notNull(),
    convertedAmount: numeric("converted_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    actualConvertedAmount: numeric("actual_converted_amount", {
      precision: 18,
      scale: 2,
    }),
    splitMode: text("split_mode").default("EQUAL").notNull(),
    paidByUserId: text("paid_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    paymentMethod: text("payment_method"),
    receiptUrl: text("receipt_url"),
    notes: text("notes"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("expense_country_date_idx").on(table.countryId, table.expenseDate),
    index("expense_trip_idx").on(table.tripId),
  ],
);

export const expenseSplits = pgTable(
  "expense_splits",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shareAmountBase: numeric("share_amount_base", {
      precision: 18,
      scale: 2,
    }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.expenseId, table.userId] })],
);

export const expenseItems = pgTable(
  "expense_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    transactionAmount: numeric("transaction_amount", { precision: 18, scale: 2 }).notNull(),
    baseAmount: numeric("base_amount", { precision: 18, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("expense_item_expense_idx").on(table.expenseId)],
);

export const expenseItemAssignments = pgTable(
  "expense_item_assignments",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => expenseItems.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shareAmountBase: numeric("share_amount_base", { precision: 18, scale: 2 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.userId] })],
);

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").default("SENT").notNull(),
    initiatedBy: text("initiated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    confirmedBy: text("confirmed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("settlement_country_status_idx").on(table.countryId, table.status),
    index("settlement_trip_idx").on(table.tripId),
    index("settlement_from_user_idx").on(table.fromUserId),
    index("settlement_to_user_idx").on(table.toUserId),
  ],
);

export const travelItems = pgTable(
  "travel_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    title: text("title").notNull(),
    itemDate: date("item_date"),
    itemTime: text("item_time"),
    area: text("area"),
    subtype: text("subtype"),
    priority: text("priority"),
    status: text("status"),
    ownerUserId: text("owner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    estimatedCost: numeric("estimated_cost", { precision: 18, scale: 2 }),
    quantity: numeric("quantity", { precision: 10, scale: 2 }),
    provider: text("provider"),
    confirmationNo: text("confirmation_no"),
    linkUrl: text("link_url"),
    notes: text("notes"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("travel_item_country_type_idx").on(table.countryId, table.itemType)],
);

export const tripInboxItems = pgTable(
  "trip_inbox_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceName: text("source_name"),
    kind: text("kind").default("BOOKING").notNull(),
    title: text("title").notNull(),
    provider: text("provider"),
    confirmationNo: text("confirmation_no"),
    bookingDate: date("booking_date"),
    bookingTime: text("booking_time"),
    rawText: text("raw_text"),
    status: text("status").default("INBOX").notNull(),
    linkedTravelItemId: uuid("linked_travel_item_id").references(() => travelItems.id, { onDelete: "set null" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("trip_inbox_trip_time_idx").on(table.tripId, table.createdAt),
    index("trip_inbox_country_idx").on(table.countryId),
  ],
);

export const locationPings = pgTable(
  "location_pings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    accuracyMeters: doublePrecision("accuracy_meters"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("location_country_user_time_idx").on(
      table.countryId,
      table.userId,
      table.createdAt,
    ),
  ],
);

export const schema = {
  user,
  session,
  loginAudits,
  account,
  verification,
  userPreferences,
  notificationPreferences,
  pushSubscriptions,
  notifications,
  apiMetrics,
  productEvents,
  activityLogs,
  appErrors,
  journeys,
  trips,
  tripMembers,
  tripBudgets,
  countries,
  tripInvites,
  countryMembers,
  expenses,
  expenseSplits,
  expenseItems,
  expenseItemAssignments,
  settlements,
  travelItems,
  tripInboxItems,
  locationPings,
};
