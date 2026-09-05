# Miles & Meals v8

## New in v8

- Admin reset passwords are temporary.
- After the next login, the traveler is forced to create their own private password.
- Admin-created users also receive a temporary password and are forced to change it.
- Profile page lets each user choose an avatar icon and color.
- Account menu displays the selected avatar.
- Dashboard greeting is simplified.
- Expense amount parsing now supports values such as `150000`, `150,000`,
  `1,234.56`, `1.234,56`, and decimal-comma exchange rates.
- Converted amount and equal split values update live while typing.
- Invalid `NaN` expense submissions are blocked with a clear message.

## Required database update

v8 adds a `user_preferences` table.

Run:

```powershell
npm install
npm run db:push
npm run build
npm run dev
```

Do not reset Neon. `db:push` adds the new table while keeping existing trip data.

## Profile

Open `/settings/profile`.

## Temporary-password flow

1. Admin creates a traveler or resets their password.
2. Existing sessions are removed when a password is reset.
3. User signs in with the temporary password.
4. Miles & Meals blocks the rest of the app.
5. User enters the temporary password and their own new password.
6. Normal app access is restored.
