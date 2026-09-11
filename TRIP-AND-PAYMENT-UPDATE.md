# Trip and payment update

- Trip editing and traveler controls are expanded by default. Traveler assignment has name search and compact rows. Invite links are secondary, behind an explicit disclosure.
- Create trip supports selecting up to 100 existing travelers. The owner is still included automatically. The server rejects missing or unavailable accounts and assigns validated users to the new trip and its country. Names remain the normal traveler-facing directory; this does not grant non-admins access to email addresses or account creation.
- Desktop Settle Up cards put the person, trip and amount in a header, with the payment form below. This removes the large empty left column. Payment metadata uses the available width.
- Mobile payment history stacks status, people, amount, metadata and allocations. Long receipt names wrap without pushing amounts off-screen.
- Users can send another full or partial payment against the remaining available balance while earlier payments await confirmation. SENT amounts remain reserved in the existing ledger and reduce the amount available to pay. Each pending payment is confirmed by its own ID. Ambiguous legacy confirmation requests are rejected when there are multiple candidates. Confirmed-payment retries do not confirm a different pending payment.
- Existing payment request IDs still provide duplicate-request protection. Overpayment and receipt-allocation checks remain enforced under the existing trip transaction lock.

Example: a RM50 bill with RM20 already sent has RM30 available. The payer can send RM10 more, leaving RM20 available. The receiver confirms the RM20 and RM10 records individually.

## Verification and deployment

311 automated tests passed; 4 database integration tests were skipped because a test database is not connected. Added API tests cover a second pending payment, rejection above the reserved balance, specific confirmation selection and confirmation retries. The production build and prebuild validators passed.

The layout fixes are code changes; installed iPhone PWA geometry and live multi-user database behavior still require verification. No real payment was made and no database was reset. No schema migration is required. Deploy the complete source following DEPLOY-VERCEL.md, then check the new flows in a Vercel preview before production.
