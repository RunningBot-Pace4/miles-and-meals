import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
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
    "{country.tripName} · {country.name}",
  )
) {
  fail(
    "Expense country selector must show Trip Name and Country.",
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
    "listAccessibleCountries",
  ) ||
  !settlementSummaryRoute.includes(
    "buildExpenseSummary",
  )
) {
  fail(
    "Live settlement summary API must enforce country access and use the canonical ledger.",
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
