# Miles & Meals — Full Source Package

This package is the complete project, not a patch.

Included in this version:

- Login with Show / Hide password
- Forgot Password page
- Secure Reset Password page
- 30-minute reset links
- Existing-session revocation after password reset
- Local reset-link output in the Visual Studio terminal when email is not configured
- Resend-based production reset emails
- Single-active-device session policy
- Better Auth admin user creation
- Admin role TypeScript compatibility fix
- Country-scoped access
- Multi-country trips
- Expense CRUD
- Per-expense exchange rates
- Equal / Percentage / Exact splits
- Dashboard and settlements
- Itinerary / Places / Meals / Shopping / Bookings
- GPS location sharing
- Miles & Meals mobile UI and PWA assets

## Important

Never commit `.env` to GitHub.

The `.gitignore` in this package excludes `.env`, `.vs/`, `node_modules/`, `.next/`, and Vercel local files.

## Local password-reset test

1. Leave `RESEND_API_KEY` and `EMAIL_FROM` empty.
2. Run `npm run dev`.
3. Open `/login`.
4. Choose `Forgot password?`.
5. Submit an existing email.
6. Copy the reset URL printed in the Visual Studio terminal.
7. Open it and set a new password.

## Production password-reset email

Set these in Vercel:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM="Miles & Meals <noreply@your-verified-domain.com>"
```
