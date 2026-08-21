import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function listFilesRecursively(
  directory,
) {
  const files = [];

  for (
    const entry of
      fs.readdirSync(
        directory,
        {
          withFileTypes: true,
        },
      )
  ) {
    const absolutePath =
      path.join(
        directory,
        entry.name,
      );

    if (
      entry.isDirectory()
    ) {
      files.push(
        ...listFilesRecursively(
          absolutePath,
        ),
      );
    } else {
      files.push(
        absolutePath,
      );
    }
  }

  return files;
}

function read(relativePath) {
  const absolutePath = path.join(
    root,
    relativePath,
  );

  if (!fs.existsSync(absolutePath)) {
    fail(`Missing ${relativePath}`);
    return "";
  }

  return fs.readFileSync(
    absolutePath,
    "utf8",
  );
}

const requiredFiles = [
  "src/components/PullToRefresh.tsx",
  "src/components/NetworkStatusBanner.tsx",
  "src/components/PwaRegister.tsx",
  "src/components/NotificationSettings.tsx",
  "src/components/ClientErrorReporter.tsx",
  "src/components/OnlineActionGuard.tsx",
  "src/app/api/live-refresh/route.ts",
  "src/app/api/notifications/preferences/route.ts",
  "src/app/api/notifications/subscription/route.ts",
  "src/app/api/export/route.ts",
  "src/app/api/errors/route.ts",
  "src/app/(app)/activity/page.tsx",
  "src/app/(app)/export/page.tsx",
  "src/app/(app)/settings/notifications/page.tsx",
  "src/app/(app)/admin/health/page.tsx",
  "src/lib/activity.ts",
  "src/lib/push.ts",
  "src/lib/request-security.ts",
  "playwright.config.ts",
  "e2e/public-pwa.spec.ts",
  "e2e/two-user-settlement.spec.ts",
  "src/components/LiveExpensesWorkspace.tsx",
  "src/components/LiveDashboardFinance.tsx",
  "src/components/NotificationCenter.tsx",
  "src/components/AdminBackupRestore.tsx",
  "src/lib/draft-storage.ts",
  "src/lib/expense-live.ts",
  "src/lib/health.ts",
  "src/lib/performance.ts",
  "src/app/api/expenses/live/route.ts",
  "src/app/api/dashboard/finance/route.ts",
  "src/app/api/notifications/test/route.ts",
  "src/app/api/notifications/inbox/route.ts",
  "src/app/api/admin/users/status/route.ts",
  "src/app/api/admin/assignments/bulk/route.ts",
  "src/app/api/admin/backup/route.ts",
  "src/app/(app)/notifications/page.tsx",
  "src/app/(app)/admin/backup/page.tsx",
  "src/components/TripManager.tsx",
  "src/components/TripBudgetForm.tsx",
  "src/components/TripQuickSelect.tsx",
  "src/components/NotificationBell.tsx",
  "src/components/BudgetAccessGate.tsx",
  "src/lib/trip-budget.ts",
  "src/lib/trip-management.ts",
  "src/lib/trip-roles.ts",
  "src/lib/budget-math.ts",
  "src/app/(app)/trips/page.tsx",
  "src/app/(app)/settings/budgets/page.tsx",
  "src/app/onboarding/budget/page.tsx",
  "src/app/api/trips/route.ts",
  "src/app/api/budgets/route.ts",
  "src/app/api/notifications/unread/route.ts",
  "tests/v46-budget-owner.test.ts",
  "src/components/NumericInputGuard.tsx",
  "src/lib/numeric-input.ts",
  "tests/numeric-input.test.ts",
  "src/app/api/trips/[id]/countries/bulk/route.ts",
  "src/lib/active-trip.ts",
  "src/app/api/active-trip/route.ts",
];

for (const file of requiredFiles) {
  read(file);
}

const schema = read(
  "src/db/schema.ts",
);

for (const table of [
  "notificationPreferences",
  "pushSubscriptions",
  "notifications",
  "apiMetrics",
  "tripBudgets",
  "activityLogs",
  "appErrors",
]) {
  if (!schema.includes(`export const ${table}`)) {
    fail(`Missing Phase 8 schema: ${table}`);
  }
}

const pullToRefresh = read(
  "src/components/PullToRefresh.tsx",
);
const globalCss = read(
  "src/app/globals.css",
);
const profileSettings = read(
  "src/components/ProfileSettingsForm.tsx",
);
const profileRoute = read(
  "src/app/api/account/profile/route.ts",
);
const adminOverview = read(
  "src/components/AdminOverview.tsx",
);
const adminRoleRoute = read(
  "src/app/api/admin/users/role/route.ts",
);

if (
  !pullToRefresh.includes(
    "ACTIVATION_DISTANCE",
  ) ||
  pullToRefresh.includes(
    'document.body.dataset.actionLoading =',
  )
) {
  fail(
    "Pull-to-refresh must preserve native scrolling and must not leave a global loading lock.",
  );
}

if (
  globalCss.includes(
    'body[data-action-loading="true"] {\n  overflow: hidden !important;',
  )
) {
  fail(
    "Global CSS must not permanently freeze scrolling from a stale action-loading flag.",
  );
}

if (
  !profileSettings.includes(
    "User name",
  ) ||
  !profileRoute.includes(
    "name: input.name",
  )
) {
  fail(
    "Profile user-name editing is missing.",
  );
}

if (
  !adminOverview.includes(
    "Change user type",
  ) ||
  !adminRoleRoute.includes(
    "adminUserRoleSchema",
  )
) {
  fail(
    "Admin user-type assignment is missing.",
  );
}

const pwaRegister = read(
  "src/components/PwaRegister.tsx",
);
const accessSource = read(
  "src/lib/access.ts",
);
const adminForms = read(
  "src/components/AdminForms.tsx",
);
const expenseForm = read(
  "src/components/ExpenseForm.tsx",
);
const adminCountryRoute = read(
  "src/app/api/admin/countries/route.ts",
);

if (
  !pwaRegister.includes(
    "isInstalledMobileApp",
  ) ||
  !pwaRegister.includes(
    "(display-mode: standalone)",
  )
) {
  fail(
    "PWA update prompt must be limited to the installed mobile app.",
  );
}

if (
  accessSource.includes(
    "isSystemAdmin",
  ) ||
  accessSource.includes(
    "return true;",
  )
) {
  fail(
    "Admin role must not bypass country assignment for travel data.",
  );
}

if (
  !adminOverview.includes(
    "Manage country access",
  ) ||
  !adminOverview.includes(
    "/api/admin/assignments",
  ) ||
  adminForms.includes(
    "Assign person to country",
  )
) {
  fail(
    "Country assignment must be managed inside each Travel Crew user card.",
  );
}

if (
  !adminForms.includes(
    "fxManualOverrideRef",
  ) ||
  !adminForms.includes(
    "Manual override",
  ) ||
  !adminForms.includes(
    "fxRequestControllerRef.current?.abort()",
  ) ||
  adminCountryRoute.includes(
    "getDailyFxRate",
  ) ||
  !adminCountryRoute.includes(
    "input.defaultExchangeRate",
  )
) {
  fail(
    "Manual FX entry must override the automatic value on both client and server.",
  );
}

if (
  !expenseForm.includes(
    "tripName: string",
  ) ||
  !expenseForm.includes(
    "{country.tripName}",
  )
) {
  fail(
    "Expense trip selector must render trip names.",
  );
}

const notificationSettings = read(
  "src/components/NotificationSettings.tsx",
);

if (
  !notificationSettings.includes(
    "function base64UrlToArrayBuffer",
  ) ||
  !notificationSettings.includes(
    "): ArrayBuffer",
  ) ||
  !notificationSettings.includes(
    "applicationServerKey:",
  ) ||
  !notificationSettings.includes(
    "base64UrlToArrayBuffer(publicKey)",
  )
) {
  fail(
    "Web Push applicationServerKey must use a guaranteed ArrayBuffer.",
  );
}

const serviceWorker = read(
  "public/sw.js",
);

for (const marker of [
  '"push"',
  '"notificationclick"',
  "SKIP_WAITING",
  "setAppBadge",
]) {
  if (!serviceWorker.includes(marker)) {
    fail(
      `Service worker missing Phase 8 marker: ${marker}`,
    );
  }
}

const settlementActionButton = read(
  "src/components/SettlementActionButton.tsx",
);
const settlementEngine = read(
  "src/lib/settlement.ts",
);
const settlementTest = read(
  "tests/settlement.test.ts",
);
const liveSettlementWorkspace = read(
  "src/components/LiveSettlementWorkspace.tsx",
);
const settlementSummaryRoute = read(
  "src/app/api/settlements/summary/route.ts",
);
const dashboardPageV44 = read(
  "src/app/(app)/dashboard/page.tsx",
);
const settlementPageV44 = read(
  "src/app/(app)/settlements/page.tsx",
);
const adminOverviewV43 = read(
  "src/components/AdminOverview.tsx",
);
const adminTripEditRoute = read(
  "src/app/api/admin/trips/[id]/route.ts",
);
const adminCountryEditRoute = read(
  "src/app/api/admin/countries/[id]/route.ts",
);

if (
  settlementActionButton.includes(
    "SavingOverlay",
  ) ||
  settlementActionButton.includes(
    "window.location.reload()",
  )
) {
  fail(
    "Settlement actions must update in place without a full-screen loader or page reload.",
  );
}

if (
  !settlementActionButton.includes(
    "mnm:settlement-updated",
  ) ||
  !liveSettlementWorkspace.includes(
    "POLL_INTERVAL_MS = 4000",
  ) ||
  !liveSettlementWorkspace.includes(
    "SETTLEMENT_UPDATED_EVENT",
  )
) {
  fail(
    "Settlement actions must trigger immediate in-place refresh and keep 4-second live polling.",
  );
}

if (
  !settlementEngine.includes(
    "Historical payments stay attached to the same two people",
  ) ||
  !settlementTest.includes(
    "keeps payment history intuitive after an expense split is edited",
  )
) {
  fail(
    "Settlement edit-after-payment reconciliation regression coverage is missing.",
  );
}

for (const marker of [
  "Everyone&apos;s trip money",
  "Total received",
  "Settlement paid",
  "Personal share",
  "Still receive",
  "Still pay",
  "Confirmed balance",
]) {
  if (
    !liveSettlementWorkspace.includes(
      marker,
    )
  ) {
    fail(
      `Live settlement workspace missing: ${marker}`,
    );
  }
}

if (
  !dashboardPageV44.includes(
    'variant="dashboard"',
  ) ||
  !settlementPageV44.includes(
    'variant="settlements"',
  )
) {
  fail(
    "Home and Settle Up must both use the live trip-money workspace.",
  );
}

if (
  !settlementSummaryRoute.includes(
    "getActiveTripContext",
  ) ||
  !settlementSummaryRoute.includes(
    "buildExpenseSummary",
  )
) {
  fail(
    "Live settlement summary API must enforce active-trip access and use the canonical ledger.",
  );
}

if (
  !adminOverviewV43.includes(
    "Edit trip",
  ) ||
  !adminOverviewV43.includes(
    "Edit country FX",
  ) ||
  !adminTripEditRoute.includes(
    "updateTripSchema",
  ) ||
  !adminCountryEditRoute.includes(
    "updateCountrySchema",
  )
) {
  fail(
    "Edit-after-create Admin configuration is missing.",
  );
}

const liveExpenses = read(
  "src/components/LiveExpensesWorkspace.tsx",
);
const plannerClientV45 = read(
  "src/components/PlannerClient.tsx",
);
const expensePageV45 = read(
  "src/app/(app)/expenses/page.tsx",
);
const plannerPageV45 = read(
  "src/app/(app)/planner/page.tsx",
);
const expenseFormV45 = read(
  "src/components/ExpenseForm.tsx",
);
const receiptParserV45 = read(
  "src/lib/receipt-parser.ts",
);
const notificationCenterV45 = read(
  "src/components/NotificationCenter.tsx",
);
const notificationSettingsV45 = read(
  "src/components/NotificationSettings.tsx",
);
const pushV45 = read(
  "src/lib/push.ts",
);
const adminStatusV45 = read(
  "src/app/api/admin/users/status/route.ts",
);
const adminBulkAccessV45 = read(
  "src/app/api/admin/assignments/bulk/route.ts",
);
const adminBackupV45 = read(
  "src/app/api/admin/backup/route.ts",
);
const healthV45 = read(
  "src/lib/health.ts",
);
const adminHealthV45 = read(
  "src/app/(app)/admin/health/page.tsx",
);
const twoUserE2EV45 = read(
  "e2e/two-user-settlement.spec.ts",
);

if (
  liveExpenses.includes(
    "window.location.reload",
  ) ||
  plannerClientV45.includes(
    "window.location.reload",
  ) ||
  expensePageV45.includes(
    "SettlementLiveRefresh",
  ) ||
  plannerPageV45.includes(
    "SettlementLiveRefresh",
  )
) {
  fail(
    "Expense and Planner collaboration must update in place without full-page live refresh.",
  );
}

if (
  !liveExpenses.includes(
    "POLL_INTERVAL_MS = 8000",
  ) ||
  !plannerClientV45.includes(
    "setItemsState",
  ) ||
  !plannerClientV45.includes(
    "8000",
  )
) {
  fail(
    "Expense and Planner in-place live polling is missing.",
  );
}

if (
  !expenseFormV45.includes(
    "Unsaved expense found",
  ) ||
  !expenseFormV45.includes(
    "restoreExpenseDraft",
  ) ||
  !plannerClientV45.includes(
    "Unsaved planner draft found",
  ) ||
  !plannerClientV45.includes(
    "restoreDraft",
  )
) {
  fail(
    "Expense and Planner draft recovery is missing.",
  );
}

if (
  !receiptParserV45.includes(
    "merchantConfidence",
  ) ||
  !receiptParserV45.includes(
    "totalConfidence",
  ) ||
  !expenseFormV45.includes(
    "Shop confidence",
  ) ||
  !expenseFormV45.includes(
    "Total confidence",
  )
) {
  fail(
    "Receipt OCR field-level confidence indicators are missing.",
  );
}

if (
  !notificationSettingsV45.includes(
    "Send test notification",
  ) ||
  !notificationCenterV45.includes(
    "Mark all read",
  ) ||
  !pushV45.includes(
    "recordInAppNotifications",
  )
) {
  fail(
    "Test notification and in-app notification center are missing.",
  );
}

if (
  !adminOverview.includes(
    "Disable user",
  ) ||
  !adminOverview.includes(
    "Select all",
  ) ||
  !adminOverview.includes(
    "Clear all",
  ) ||
  !adminStatusV45.includes(
    "banned: input.disabled",
  ) ||
  !adminBulkAccessV45.includes(
    "countryIds",
  )
) {
  fail(
    "Admin disable/reactivate and bulk country access controls are missing.",
  );
}

if (
  !adminBackupV45.includes(
    "RESTORE TRAVEL DATA",
  ) ||
  !adminBackupV45.includes(
    "DELETE FROM trips",
  ) ||
  adminBackupV45.includes(
    "DELETE FROM user",
  ) ||
  !adminBackupV45.includes(
    "loginDataPreserved",
  )
) {
  fail(
    "Controlled travel backup restore must preserve login tables.",
  );
}

if (
  !healthV45.includes(
    "runConsistencyChecks",
  ) ||
  !healthV45.includes(
    "loadPerformanceSnapshot",
  ) ||
  !adminHealthV45.includes(
    "DATABASE CONSISTENCY",
  ) ||
  !adminHealthV45.includes(
    "PERFORMANCE",
  )
) {
  fail(
    "Database consistency and free performance diagnostics are missing.",
  );
}

if (
  !twoUserE2EV45.includes(
    "Mark Paid and Confirm Received update in place without page reload",
  )
) {
  fail(
    "Two-user settlement E2E coverage is missing.",
  );
}

const tripManagerV46 = read(
  "src/components/TripManager.tsx",
);
const tripBudgetFormV46 = read(
  "src/components/TripBudgetForm.tsx",
);
const dashboardV46 = read(
  "src/app/(app)/dashboard/page.tsx",
);
const dashboardFinanceV46 = read(
  "src/components/LiveDashboardFinance.tsx",
);
const notificationBellV46 = read(
  "src/components/NotificationBell.tsx",
);
const appLayoutV46 = read(
  "src/app/(app)/layout.tsx",
);
const budgetGateV46 = read(
  "src/components/BudgetAccessGate.tsx",
);
const tripApiV46 = read(
  "src/app/api/trips/route.ts",
);
const tripBudgetV46 = read(
  "src/lib/trip-budget.ts",
);
const tripManagementV46 = read(
  "src/lib/trip-management.ts",
);
const backupV46 = read(
  "src/app/api/admin/backup/route.ts",
);
const v46Tests = read(
  "tests/v46-budget-owner.test.ts",
);

if (
  !tripApiV46.includes(
    'role: "OWNER"',
  ) ||
  !tripManagementV46.includes(
    "canManageTrip",
  ) ||
  !tripManagerV46.includes(
    "Create a new trip",
  ) ||
  !tripManagerV46.includes(
    "Assign travelers to this trip",
  )
) {
  fail(
    "Trip Owner self-service trip creation and traveler assignment are missing.",
  );
}

for (const marker of [
  "myBudget",
  "combinedBudget",
  "budgetsSubmitted",
  "travelerCount",
]) {
  if (
    !tripBudgetV46.includes(
      marker,
    )
  ) {
    fail(
      `Personal/group budget layer missing: ${marker}`,
    );
  }
}

if (
  !dashboardV46.includes(
    "TripQuickSelect",
  ) ||
  !dashboardV46.includes(
    "loadTripBudgetSummary",
  ) ||
  !dashboardFinanceV46.includes(
    "MY TRAVEL WALLET",
  ) ||
  !dashboardFinanceV46.includes(
    "GROUP TRIP",
  ) ||
  !dashboardFinanceV46.includes(
    "Combined budget",
  )
) {
  fail(
    "Home must use true Trip selection and separate personal/group budgets.",
  );
}

if (
  !tripBudgetFormV46.includes(
    "Start my trip",
  ) ||
  !budgetGateV46.includes(
    "/onboarding/budget",
  ) ||
  !appLayoutV46.includes(
    "listMissingTripBudgets",
  )
) {
  fail(
    "Required personal-budget onboarding after trip assignment is missing.",
  );
}

if (
  !notificationBellV46.includes(
    "unreadCount",
  ) ||
  !notificationBellV46.includes(
    'href="/notifications"',
  ) ||
  !appLayoutV46.includes(
    "NotificationBell",
  )
) {
  fail(
    "Top-right notification bell with unread count is missing.",
  );
}

if (
  !backupV46.includes(
    "tripBudgets",
  ) ||
  !backupV46.includes(
    "trip_budgets",
  )
) {
  fail(
    "Admin backup/restore must include personal trip budgets.",
  );
}

if (
  !v46Tests.includes(
    "sums individual traveler budgets",
  ) ||
  !v46Tests.includes(
    "OWNER",
  )
) {
  fail(
    "v46 budget and Trip Owner regression tests are missing.",
  );
}

const numericGuardV47 = read(
  "src/components/NumericInputGuard.tsx",
);
const numericInputV47 = read(
  "src/lib/numeric-input.ts",
);
const rootLayoutV47 = read(
  "src/app/layout.tsx",
);
const tripManagerV47 = read(
  "src/components/TripManager.tsx",
);
const tripRouteV47 = read(
  "src/app/api/trips/route.ts",
);
const tripPageV47 = read(
  "src/app/(app)/trips/page.tsx",
);
const accessV47 = read(
  "src/lib/access.ts",
);
const tripManagementV47 = read(
  "src/lib/trip-management.ts",
);
const budgetFormV47 = read(
  "src/components/TripBudgetForm.tsx",
);
const adminOverviewV47 = read(
  "src/components/AdminOverview.tsx",
);
const numericTestsV47 = read(
  "tests/numeric-input.test.ts",
);

if (
  !rootLayoutV47.includes(
    "NumericInputGuard",
  ) ||
  !numericGuardV47.includes(
    "beforeinput",
  ) ||
  !numericInputV47.includes(
    "sanitizePositiveDecimalInput",
  ) ||
  !numericTestsV47.includes(
    "removes alphabetic characters",
  )
) {
  fail(
    "Project-wide numeric input protection is missing.",
  );
}

const numericInputFiles =
  listFilesRecursively(
    path.join(root, "src"),
  ).filter((filePath) =>
  /\.(tsx?)$/.test(filePath),
);

for (
  const filePath of
    numericInputFiles
) {
  const source =
    fs.readFileSync(
      filePath,
      "utf8",
    );

  if (
    /inputMode="(?:decimal|numeric)"/.test(
      source,
    ) &&
    !source.includes(
      'data-numeric-input="decimal"',
    )
  ) {
    fail(
      `Numeric field missing project-wide guard marker: ${path.relative(
        root,
        filePath,
      )}`,
    );
  }
}

if (
  budgetFormV47.includes(
    "Your personal target",
  ) ||
  budgetFormV47.includes(
    "The group dashboard uses the combined total",
  )
) {
  fail(
    "Removed Personal Budget explanatory block returned.",
  );
}

if (
  !tripManagerV47.includes(
    "Destination",
  ) ||
  !tripManagerV47.includes(
    "selectedCreateCountry",
  ) ||
  !tripRouteV47.includes(
    "firstCountry",
  ) ||
  !tripRouteV47.includes(
    "countryMembers",
  )
) {
  fail(
    "Create Trip must include its destination directly.",
  );
}

if (
  !tripManagerV47.includes(
    'className="owner-country-card"',
  ) ||
  !tripManagerV47.includes(
    "travelers · Manage",
  )
) {
  fail(
    "Trip Owner country management affordance is missing.",
  );
}

if (
  accessV47.includes(
    "email: user.email",
  )
) {
  fail(
    "Normal travel member APIs must never return other users' email addresses.",
  );
}

if (
  !tripManagementV47.includes(
    "includeEmail: boolean",
  ) ||
  !tripPageV47.includes(
    "isSystemAdmin",
  ) ||
  !tripManagerV47.includes(
    "member.email ?",
  )
) {
  fail(
    "Trip Owner user lists must expose email only to System Admin.",
  );
}

if (
  !adminOverviewV47.includes(
    "country.tripName",
  )
) {
  fail(
    "Configured Countries must display the trip name.",
  );
}

const notificationCenterV48 = read(
  "src/components/NotificationCenter.tsx",
);
const tripManagerV48 = read(
  "src/components/TripManager.tsx",
);
const bulkCountryRouteV48 = read(
  "src/app/api/trips/[id]/countries/bulk/route.ts",
);
const validationV48 = read(
  "src/lib/validation.ts",
);

if (
  !notificationCenterV48.includes(
    "selectedNotification",
  ) ||
  !notificationCenterV48.includes(
    "notification-detail-dialog",
  ) ||
  !notificationCenterV48.includes(
    "Open related screen",
  ) ||
  notificationCenterV48.includes(
    "openNotification(",
  )
) {
  fail(
    "Notification items must open details before navigating to the related screen.",
  );
}

// v48 introduced multi-country queues, but v51 intentionally removes them.
// Keep only the Notification Center regression from that release.
void tripManagerV48;
void bulkCountryRouteV48;
void validationV48;

const activeTripV49 = read(
  "src/lib/active-trip.ts",
);
const activeTripRouteV49 = read(
  "src/app/api/active-trip/route.ts",
);
const tripQuickSelectV49 = read(
  "src/components/TripQuickSelect.tsx",
);
const dashboardV49 = read(
  "src/app/(app)/dashboard/page.tsx",
);
const plannerPageV49 = read(
  "src/app/(app)/planner/page.tsx",
);
const plannerClientV49 = read(
  "src/components/PlannerClient.tsx",
);
const expensesPageV49 = read(
  "src/app/(app)/expenses/page.tsx",
);
const newExpensePageV49 = read(
  "src/app/(app)/expenses/new/page.tsx",
);
const settlementsPageV49 = read(
  "src/app/(app)/settlements/page.tsx",
);
const locationPageV49 = read(
  "src/app/(app)/location/page.tsx",
);
const tripManagerV49 = read(
  "src/components/TripManager.tsx",
);

if (
  !activeTripV49.includes(
    "ACTIVE_TRIP_COOKIE",
  ) ||
  !activeTripV49.includes(
    "getActiveTripContext",
  ) ||
  !activeTripV49.includes(
    "isCountryInActiveTrip",
  ) ||
  !activeTripRouteV49.includes(
    "response.cookies.set",
  ) ||
  !activeTripRouteV49.includes(
    "isTrustedMutationRequest",
  )
) {
  fail(
    "Validated app-wide active trip persistence is missing.",
  );
}

if (
  !tripQuickSelectV49.includes(
    '"/api/active-trip"',
  ) ||
  !tripQuickSelectV49.includes(
    'window.location.assign(\n        "/dashboard"',
  ) ||
  dashboardV49.includes(
    "searchParams"
  )
) {
  fail(
    "Home trip selection must persist globally instead of using page-only query state.",
  );
}

for (
  const [label, source]
  of [
    ["Planner", plannerPageV49],
    ["Expenses", expensesPageV49],
    ["New Expense", newExpensePageV49],
    ["Settlements", settlementsPageV49],
    ["Location", locationPageV49],
  ]
) {
  if (
    !source.includes(
      "getActiveTripContext",
    )
  ) {
    fail(
      `${label} must follow the active trip selected on Home.`,
    );
  }
}

if (
  !plannerClientV49.includes(
    'aria-label="Change planner trip"',
  ) ||
  !plannerClientV49.includes(
    '"/api/active-trip"',
  ) ||
  !plannerClientV49.includes(
    "{trip.name}",
  ) ||
  plannerClientV49.includes(
    "All destinations in this trip",
  )
) {
  fail(
    "Planner must follow Home by default while still allowing an in-page trip switch.",
  );
}

if (
  tripManagerV49.includes(
    "existingCountryCodes",
  ) ||
  tripManagerV49.includes(
    "queuedCountryCodes",
  ) ||
  tripManagerV49.includes(
    "+ Add destination",
  )
) {
  fail(
    "Trip Owner must not be able to add or queue another destination country.",
  );
}

if (
  tripManagerV49.includes(
    "First destination"
  ) ||
  !tripManagerV49.includes(
    "Destination"
  )
) {
  fail(
    "Create Trip destination label must be Destination.",
  );
}

const tripManagerV50 = read(
  "src/components/TripManager.tsx",
);
const adminOverviewV50 = read(
  "src/components/AdminOverview.tsx",
);
const adminTripRouteV50 = read(
  "src/app/api/admin/trips/[id]/route.ts",
);
const adminPageV50 = read(
  "src/app/(app)/admin/page.tsx",
);
const validationV50 = read(
  "src/lib/validation.ts",
);

const ownerCountryRouteV51 = read(
  "src/app/api/trips/[id]/countries/route.ts",
);
const ownerBulkCountryRouteV51 = read(
  "src/app/api/trips/[id]/countries/bulk/route.ts",
);
const selfServiceTripRouteV51 = read(
  "src/app/api/trips/route.ts",
);
const adminCountryRouteV51 = read(
  "src/app/api/admin/countries/route.ts",
);

const expenseFormV52 = read(
  "src/components/ExpenseForm.tsx",
);

if (
  tripManagerV50.includes(
    "+ Add destination",
  ) ||
  tripManagerV50.includes(
    "Add another destination",
  ) ||
  tripManagerV50.includes(
    "pendingCountries",
  ) ||
  !tripManagerV50.includes(
    "DESTINATION COUNTRY",
  ) ||
  !tripManagerV50.includes(
    'admin-status-pill active">Locked',
  ) ||
  !tripManagerV50.includes(
    "required",
  )
) {
  fail(
    "Trip Owner must create exactly one destination and see it as locked afterward.",
  );
}

if (
  !ownerCountryRouteV51.includes(
    "Destination country is locked after trip creation",
  ) ||
  !ownerBulkCountryRouteV51.includes(
    "Multiple destination countries are not supported",
  ) ||
  !selfServiceTripRouteV51.includes(
    "input.firstCountry.code",
  ) ||
  !adminCountryRouteV51.includes(
    "A trip can only have one destination country",
  )
) {
  fail(
    "Single-country enforcement must exist in both owner and Admin APIs.",
  );
}

if (
  !newExpensePageV49.includes(
    "activeTrip.allCountries",
  ) ||
  !expenseFormV52.includes(
    'aria-label="Choose expense trip"',
  ) ||
  !expenseFormV52.includes(
    "{country.tripName}",
  ) ||
  !expenseFormV52.includes(
    '"/api/active-trip"',
  ) ||
  expenseFormV52.includes(
    "Country\n            <select",
  )
) {
  fail(
    "Add Expense must default to the active Home trip and allow switching by trip name.",
  );
}

if (
  !adminTripRouteV50.includes(
    "export async function DELETE",
  ) ||
  !adminTripRouteV50.includes(
    "isSystemAdmin",
  ) ||
  !adminTripRouteV50.includes(
    "confirmationName !==\n      existing.name",
  ) ||
  !validationV50.includes(
    "deleteTripSchema",
  )
) {
  fail(
    "Permanent trip deletion must be System Admin-only and require the exact trip name.",
  );
}

if (
  !adminOverviewV50.includes(
    "admin-danger-zone",
  ) ||
  !adminOverviewV50.includes(
    "Delete trip permanently",
  ) ||
  !adminOverviewV50.includes(
    "deleteTripConfirmations",
  )
) {
  fail(
    "Admin trip UI must include the protected delete danger zone.",
  );
}

if (
  tripManagerV50.includes(
    "Delete trip permanently",
  ) ||
  tripManagerV50.includes(
    "/api/admin/trips/"
  )
) {
  fail(
    "Trip Owners must not receive a trip deletion control.",
  );
}

if (
  adminPageV50.includes(
    "seenTripNames"
  )
) {
  fail(
    "Admin must see every trip so same-name trips can still be managed or deleted safely.",
  );
}

const liveRefresh = read(
  "src/app/api/live-refresh/route.ts",
);

for (const marker of [
  "settlementVersion",
  "expenseVersion",
  "plannerVersion",
  "activityLogs",
]) {
  if (!liveRefresh.includes(marker)) {
    fail(
      `Live refresh missing marker: ${marker}`,
    );
  }
}

const packageJson = JSON.parse(
  read("package.json"),
);

if (
  packageJson.dependencies?.["web-push"] !==
  "3.6.7"
) {
  fail("web-push 3.6.7 dependency is required");
}

if (
  packageJson.devDependencies?.[
    "@playwright/test"
  ] !== "1.62.1"
) {
  fail(
    "@playwright/test 1.62.1 dev dependency is required",
  );
}

const forbiddenPaidProviders = [
  "@sentry/",
  "onesignal",
  "firebase-admin",
  "@firebase/",
  "pusher",
  "ably",
];

const sourceRoots = [
  path.join(root, "src"),
];

function scan(directory) {
  for (const entry of fs.readdirSync(
    directory,
    {
      withFileTypes: true,
    },
  )) {
    const absolutePath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      scan(absolutePath);
      continue;
    }

    if (
      !entry.isFile() ||
      !/\.(ts|tsx|js|mjs|json)$/.test(
        entry.name,
      )
    ) {
      continue;
    }

    const source = fs.readFileSync(
      absolutePath,
      "utf8",
    ).toLowerCase();

    for (const provider of forbiddenPaidProviders) {
      if (
        source.includes(
          provider.toLowerCase(),
        )
      ) {
        fail(
          `Unexpected paid-provider reference in ${path.relative(
            root,
            absolutePath,
          )}: ${provider}`,
        );
      }
    }
  }
}

for (const sourceRoot of sourceRoots) {
  scan(sourceRoot);
}


const apiRoot = path.join(
  root,
  "src",
  "app",
  "api",
);

function validateMutationSecurity(directory) {
  for (const entry of fs.readdirSync(
    directory,
    {
      withFileTypes: true,
    },
  )) {
    const absolutePath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      validateMutationSecurity(
        absolutePath,
      );
      continue;
    }

    if (
      !entry.isFile() ||
      entry.name !== "route.ts"
    ) {
      continue;
    }

    const source = fs.readFileSync(
      absolutePath,
      "utf8",
    );

    const hasAppMutation =
      /export async function (POST|PUT|PATCH|DELETE)\(/.test(
        source,
      );

    const isBetterAuthCatchAll =
      absolutePath.includes(
        `${path.sep}auth${path.sep}`,
      );

    if (
      hasAppMutation &&
      !isBetterAuthCatchAll &&
      !source.includes(
        "isTrustedMutationRequest",
      )
    ) {
      fail(
        `Mutation route missing same-origin guard: ${path.relative(
          root,
          absolutePath,
        )}`,
      );
    }
  }
}

validateMutationSecurity(apiRoot);

if (failures.length > 0) {
  console.error(
    "Phase 8 validation failed:",
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "Phase 8 validation passed.",
);
