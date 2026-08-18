# Miles & Meals

Travel together. Spend smarter.

Mobile-first travel tracker built with Next.js, Better Auth, Neon PostgreSQL,
Drizzle ORM and Vercel.

## v7 highlights

- Responsive mobile, tablet and desktop layout
- Mobile bottom navigation and desktop vertical sidebar
- Richer dashboard and first-trip Admin onboarding
- Top-right account avatar menu
- Change Password page
- Admin password reset for travelers
- Normal traveler registration page
- Fixed async form reset crash when creating trips/planner items
- Branded loading splash and authenticated route skeletons
- Button-level loading states for Admin forms

## Main features

- Email/password login and registration
- One active server-side session per account
- Admin trip creation and multi-country setup
- Admin country assignment
- Normal users only see assigned-country data
- Dashboard with budget, spending, payer and settlement summaries
- Expense add/view/edit/delete
- Historical per-expense FX rates
- Equal / Percentage / Exact Amount splits
- Itinerary / Places / Meals / Shopping / Bookings
- GPS location sharing with country-level authorization
- MapLibre member map

## Passwords

- Users can change their own password from the top-right avatar menu.
- Admin can reset another user's password from Admin.
- Forgot Password is Admin-assisted; no email provider/API key is required.
- Normal users can register at `/register`.

## Visual Studio 2026

Open this folder directly:

```text
File → Open → Folder
```

Then run:

```powershell
Copy-Item .env.example .env
npm install
npm run db:push
npm run seed:admin
npm run build
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"

BETTER_AUTH_SECRET="replace-with-a-new-random-secret-at-least-32-characters"

BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

ADMIN_NAME="Travel Admin"
ADMIN_EMAIL="your-real-email@example.com"
ADMIN_PASSWORD="ChangeThisPassword123!"

RESET_DATABASE="NO"
```

For Vercel, change the two app URLs to your real production URL.

## Neon

`npm run db:push` creates/updates the required schema.

To intentionally clear all Miles & Meals data:

```powershell
$env:RESET_DATABASE="YES"
npm run db:reset
Remove-Item Env:RESET_DATABASE

npm run db:push
npm run seed:admin
```

This is destructive.

## Registration and access

A newly registered user is a normal user. Registration does not automatically
grant trip access.

Admin must:

1. Create a trip.
2. Add countries.
3. Assign users to countries.

Server-side authorization prevents normal users from reading data for
unassigned countries.

## Exchange rates

A country's exchange rate is only a default for new expenses. Every expense
stores the actual rate used for that transaction, so later changes to the
country default do not alter historical spending.

## GPS

Browser geolocation requires HTTPS and user permission. Vercel supplies HTTPS.
Continuous tracking while the app is fully suspended/closed is a mobile-browser
limitation and would require a native companion app later.

## Tests

```powershell
npm test
```
