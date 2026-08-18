import {
  boolean,
  date,
  doublePrecision,
  index,
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").default("MYR").notNull(),
  budget: numeric("budget", { precision: 18, scale: 2 }).default("0").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("country_trip_code_uq").on(table.tripId, table.code),
    index("country_trip_idx").on(table.tripId),
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
  account,
  verification,
  userPreferences,
  trips,
  tripMembers,
  countries,
  countryMembers,
  expenses,
  expenseSplits,
  settlements,
  travelItems,
  locationPings,
};
