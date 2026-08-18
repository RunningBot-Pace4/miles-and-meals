# Miles & Meals — Reset DB and Password Email

## Clear the Neon database

This deletes ALL Miles & Meals data in the configured `DATABASE_URL`.

PowerShell:

```powershell
$env:RESET_DATABASE="YES"
npm run db:reset
Remove-Item Env:RESET_DATABASE

npm run db:push
npm run seed:admin
```

Before `seed:admin`, set `ADMIN_EMAIL` in `.env` to a real email inbox you
control.

## Password reset email on Vercel

Required Vercel Environment Variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`

For normal production delivery, `EMAIL_FROM` must use a domain verified in
Resend.

If you use Resend's test sender (`onboarding@resend.dev`), Resend only permits
sending to the email address associated with your own Resend account.

After changing Vercel Environment Variables, redeploy.

## Check delivery

Open Vercel logs and search for:

`[Miles & Meals] Password reset email accepted by Resend`

The log includes the Resend Email ID.

If Resend rejects the email, the Vercel logs include the HTTP status and
Resend error message.
