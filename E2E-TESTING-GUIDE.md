# E2E Testing Guide

## What E2E means

E2E means **End-to-End**. Playwright opens a real browser and behaves like a traveler: it signs in, opens pages, changes screen sizes, uses dropdowns and checks that the final screen is correct. It catches problems that a small code/unit test cannot see, such as a button hidden on iPhone width or a route failing after login.

## First-time setup

From the project folder:

```powershell
npm install
npm run test:e2e:install
```

Create `.env` and prepare one normal test account that can access at least one Trip. Start the app once to confirm the account can sign in.

## Safe local basic test (Windows PowerShell)

```powershell
$env:E2E_EMAIL="test-user@example.com"
$env:E2E_PASSWORD="your-test-password"
npm run test:e2e -- e2e/public-pwa.spec.ts e2e/authenticated-phase8.spec.ts e2e/mobile-v69-complete-flow.spec.ts e2e/mobile-launch-candidate.spec.ts e2e/smart-settlement-audit-v70.spec.ts e2e/v78-ux.spec.ts
Remove-Item Env:E2E_EMAIL
Remove-Item Env:E2E_PASSWORD
```

If `E2E_BASE_URL` is not set, Playwright starts the local app at `http://127.0.0.1:3000` automatically.

## Test a staging deployment

```powershell
$env:E2E_BASE_URL="https://your-staging-domain.example"
$env:E2E_EMAIL="test-user@example.com"
$env:E2E_PASSWORD="your-test-password"
npm run test:e2e -- e2e/public-pwa.spec.ts e2e/mobile-v69-complete-flow.spec.ts e2e/v78-ux.spec.ts
```

Use a staging/test account, not a personal production account.

## How to read the result

- `passed` — the browser flow worked.
- `skipped` — required test credentials or fixture data were not supplied; this is not a pass or failure.
- `failed` — Playwright saves a screenshot and trace for the failed step. Open the HTML report or rerun with `--headed` to watch the browser.

```powershell
npm run test:e2e -- e2e/v78-ux.spec.ts --headed
```

## Data-changing E2E tests

`two-user-settlement.spec.ts` marks a payment paid/received. `financial-close-owner.spec.ts` temporarily changes the financial checkpoint and restores it. Run these only with dedicated staging fixtures. The financial checkpoint test additionally requires `E2E_ALLOW_FINANCIAL_MUTATION=1`, so it cannot run accidentally with only the basic credentials.
