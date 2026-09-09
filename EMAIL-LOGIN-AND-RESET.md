# Email login and Neon cleanup

Validation: production build passed; 248 tests passed. Four database integration
tests were skipped because no separate test database was configured.

Email verification is no longer required, in production or development.
Existing users can sign in with their existing email and password even when
emailVerified is false. New users can register without an email provider.
No SQL update to user verification flags is necessary. Passwords, roles and
account bans remain in effect. Login errors now show their actual error message
instead of labelling every HTTP 403 as an email-verification problem.

Deploy the updated source to Vercel first. The verification requirement will
remain on the live site until that deployment completes. RESEND_API_KEY and
EMAIL_FROM are no longer required for signup/sign-in.

## Optional destructive cleanup

Use `database/RESET-APP-DATA-KEEP-ACCOUNTS.sql` from this package.
The reset is separate from the login fix: do not reset merely to enable login.

1. Create a backup/branch in Neon. Stop app use and offline syncing during reset.
2. In Neon SQL Editor, select the intended database/branch and paste the complete
   SQL file. Run the whole file together, including BEGIN and COMMIT.
3. Check preserved_users and preserved_login_accounts remain populated, and
   remaining_trips, remaining_expenses and remaining_payments are zero.
4. Sign in again. Old sessions and verification tokens have been cleared.

Keeps ALL users, passwords/OAuth account credentials, roles, account status,
profile preferences and password-change flags. Clears trips, members, receipts,
expenses, payments/allocations, plans, memories, documents, notifications,
subscriptions and logs, plus sessions and verification tokens.

This targets the tables in the supplied schema. It deliberately uses no CASCADE:
if your DB has missing tables or additional foreign-key dependencies, the
transaction fails and rolls back. Do not bypass that error with CASCADE.

Database cleanup cannot remove locally saved offline queues on other devices.
Discard old queued changes and clear this site's stored data/offline packs on
each device before reconnecting, so old work is not resubmitted.

The cleanup script has been checked against the source schema. It has NOT been
executed against your Neon database. Keep the backup until you verify the result.
