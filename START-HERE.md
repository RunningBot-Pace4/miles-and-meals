# START HERE — Miles & Meals

You have two ways to open Miles & Meals.

## A. See the design immediately

No database or coding tools are needed.

1. Extract `miles-and-meals-source.zip`.
2. Open the extracted `miles-and-meals` folder.
3. Double-click `design-preview.html`.
4. Use the Home, Plan and Add buttons at the bottom.

This is only a visual preview. It does not save data.

## B. Run the real app in Visual Studio 2026

### 1. Install the required tools

- Visual Studio 2026 with the **Node.js development** workload.
- Node.js 22 or newer.
- A Neon PostgreSQL database.

### 2. Open the project

1. Start Visual Studio 2026.
2. Choose **File > Open > Folder**.
3. Select the extracted `miles-and-meals` folder — the folder containing `package.json`.
4. Visual Studio will show the files in Solution Explorer.

Do not look for a `.sln` file. This is a Next.js/Node.js folder project.

### 3. Create the local environment file

Open the Visual Studio terminal in the project folder and run:

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in:

```env
DATABASE_URL=YOUR_NEON_CONNECTION_STRING
BETTER_AUTH_SECRET=PUT_A_LONG_RANDOM_SECRET_HERE
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

ADMIN_NAME=Travel Admin
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=Use-A-Strong-Password-123!
```

Never upload your real `.env` file to GitHub.

### 4. Install and prepare the app

Run these commands one by one:

```powershell
npm install
npm run db:push
npm run seed:admin
npm test
npm run dev
```

When the terminal shows that Next.js is ready, open:

```text
http://localhost:3000
```

Log in using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` that you placed in `.env`.

### 5. First things to configure inside Miles & Meals

1. Sign in as Admin.
2. Create your trip.
3. Create countries.
4. Set each country's currency and default FX rate.
5. Create traveler accounts.
6. Assign each traveler to the countries they may see.
7. Start adding plans and expenses.

## Common problems

### `npm` is not recognized

Node.js is not installed correctly or Windows needs to be restarted after installation.

Check:

```powershell
node --version
npm --version
```

This project expects Node.js 22 or newer.

### Database connection error

Check that `DATABASE_URL` in `.env` is the connection string from your Neon project.

### Login does not work

Make sure you already ran:

```powershell
npm run db:push
npm run seed:admin
```

Then restart the development server:

```powershell
npm run dev
```

### Port 3000 is already used

Next.js may automatically choose another port such as 3001. Open the URL shown in the Visual Studio terminal.

## Files you will edit most often

```text
src/components/ExpenseForm.tsx      Add/edit expense screen
src/components/PlannerClient.tsx    Plan/Places/Meals/Shop/Bookings
src/app/globals.css                 Miles & Meals design
src/app/(app)/dashboard/page.tsx    Dashboard
src/app/(app)/location/page.tsx     GPS map page
src/app/(app)/admin/page.tsx        Admin page
src/db/schema.ts                    Neon database schema
```


## Forgot password / reset password

The login screen now has:

- **Show / Hide** beside the password field.
- **Forgot password?** below the password field.

For local testing you do not need an email provider:

1. Run `npm run dev`.
2. Open `http://localhost:3000/login`.
3. Choose **Forgot password?**.
4. Enter an existing user email.
5. Look at the Visual Studio terminal.
6. Miles & Meals prints a password-reset URL there when Resend is not configured.
7. Copy that URL into your browser.
8. Enter and confirm the new password.
9. Sign in again.

For a real Vercel deployment, configure:

```env
RESEND_API_KEY=re_your_api_key
EMAIL_FROM="Miles & Meals <noreply@your-verified-domain.com>"
```

The app never stores or displays a readable copy of a user's saved password. The Show button only reveals what is currently typed into the password box.
