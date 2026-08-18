# Miles & Meals v6 — Simple Accounts

## What changed

- No Resend/API key is required.
- Normal users can register at `/register`.
- Registered users default to the normal `user` role.
- A newly registered user sees no country data until an Admin assigns them.
- Forgot Password is handled by an Admin.
- Admin can reset any user's password from Admin → Reset user password.
- Resetting a password signs out that user's existing session.

## Why email-only password reset is not included

Allowing someone to type an email address and immediately choose a new password
would let anyone who knows another traveler's email take over that account.

## Local setup

```powershell
npm install
npm run db:push
npm run seed:admin
npm run build
npm run dev
```

Open:

- Login: `http://localhost:3000/login`
- Register: `http://localhost:3000/register`
- Admin: `http://localhost:3000/admin`

## Normal user flow

1. Traveler opens `/register`.
2. Traveler enters name, email, password and confirmation.
3. Account is created as a normal user.
4. Admin opens `/admin`.
5. Admin assigns that traveler to the correct country.
6. The traveler can now see only assigned country data.

## Forgot password flow

1. Traveler tells the Admin their account email.
2. Admin opens `/admin`.
3. Admin uses `Reset user password`.
4. Admin gives the traveler the temporary password.
5. Existing sessions for that user are signed out.
6. Traveler signs in with the temporary password.
