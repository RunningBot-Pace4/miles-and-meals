# Miles & Meals

> Travel together. Spend smarter.

**New here? Open `START-HERE.md` first.**  
For an instant visual preview with no setup, double-click `design-preview.html`.

## Latest mobile UI update

- Polished Add Expense flow with large currency/amount controls
- FX source selector: Default / Cash / Card / Manual
- Per-expense historical FX preserved
- Tap-friendly payer avatars
- Equal / Percentage / Exact split UI with validation summary
- Redesigned Plan / Places / Meals / Shopping / Bookings tabs
- Timeline-style itinerary cards and compact travel cards
- Country filter remains permission-aware

## Brand & UI

- **Primary:** Travel Teal `#0F766E`
- **Accent:** Meal Amber `#F59E0B`
- **Background:** Warm Off-White `#FBFAF7`
- **Logo:** location pin + fork
- **Mobile navigation:** Home · Plan · Add · Map · More
- **Design:** rounded travel cards, large outdoor-friendly touch targets, compact financial summaries
- **App icon:** `public/miles-meals-icon.svg`


Mobile-first travel tracker built for Visual Studio 2026, Vercel and Neon PostgreSQL.

## Included

- Better Auth email/password login
- One active session per account; a new login invalidates the previous device
- Admin user creation
- Admin trip and multi-country setup
- Admin country assignment; members only see assigned countries
- Dashboard with budget, spending categories, payers and settlement
- Expense add/view/edit/delete
- Per-expense FX rate with Default / Cash Exchange / Credit Card / Manual source
- Optional actual card/base-currency charge
- Payer plus Equal / Percentage / Exact Amount split selection
- Itinerary / Places / Food / Shopping / Bookings planner
- GPS sharing with per-country authorization
- MapLibre live member map
- Mobile bottom navigation

## Password recovery

Miles & Meals includes:

- **Show / Hide password** on the sign-in screen. This only reveals the password currently typed into the browser; stored passwords remain hashed and cannot be displayed.
- **Forgot password** at `/forgot-password`.
- **Reset password** at `/reset-password`.
- Reset links expire after 30 minutes.
- All existing sessions are revoked after a successful password reset.
- Password-reset requests are rate-limited.

### Local testing

If `RESEND_API_KEY` and `EMAIL_FROM` are not configured while running locally, submit the Forgot Password form and copy the reset URL printed in the Visual Studio terminal.

### Production email

For deployed password-reset emails, add these environment variables to `.env` locally and to Vercel:

```env
RESEND_API_KEY=re_your_api_key
EMAIL_FROM="Miles & Meals <noreply@your-verified-domain.com>"
```

The sender domain must be configured/verified with your email provider.

## Visual Studio 2026

1. Install the Node.js development workload.
2. Open Visual Studio 2026.
3. Select **Open a local folder** and choose this repository.
4. Open the integrated terminal.

## Local setup

```powershell
Copy-Item .env.example .env
npm install
npm run db:push
npm run seed:admin
npm run dev
```

Open `http://localhost:3000`.

## Neon

Create a Neon project and copy its pooled/serverless connection string into:

```env
DATABASE_URL=postgresql://...
```

## Authentication secret

Generate a strong secret:

```powershell
openssl rand -base64 32
```

Set it as `BETTER_AUTH_SECRET`.

The admin seed uses:

```env
ADMIN_NAME=Travel Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeThisPassword123!
```

Change the password before using the app with real travel data.

## Vercel deployment

1. Push the source to GitHub.
2. Import the repository into Vercel.
3. Add these environment variables in Vercel:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL=https://your-domain.vercel.app`
   - `NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app`
   - `RESEND_API_KEY`
   - `EMAIL_FROM=Miles & Meals <noreply@your-verified-domain.com>`
4. Deploy.

Before the first production deploy, run database schema push against the production Neon database:

```powershell
npm run db:push
```

Seed the first admin using production environment variables from a trusted local machine.

## Country privacy model

Every server request checks the authenticated user's country access. Normal users do not receive data for countries they are not assigned to. Admins can see all countries.

The same rule is applied to:
- dashboard
- planner
- expenses
- GPS locations

## Exchange rate behavior

`countries.default_exchange_rate` is only a default for new expenses.

Every expense stores:
- transaction currency
- transaction amount
- exchange rate used
- calculated base amount
- rate source
- optional actual base/card amount

Changing a country's default exchange rate does not recalculate historical expenses.

## GPS limitation

Browser GPS requires HTTPS and explicit permission. Vercel provides HTTPS.

Mobile browsers may pause the website when the phone is locked or the browser is suspended. This source is suitable for live tracking while the web app remains active. True continuous background tracking requires a native mobile companion later.

## Tests

```powershell
npm test
```


## Better Auth admin API typing

The admin user creation route uses a narrow local type adapter for `auth.api.createUser`. This avoids a Better Auth plugin endpoint inference issue while retaining the documented server API at runtime.
