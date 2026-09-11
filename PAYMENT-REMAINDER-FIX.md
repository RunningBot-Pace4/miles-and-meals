# Payment amount resets to the remaining balance

After a successful payment, Home immediately replaces the submitted amount
with the remaining amount. The next ledger update reconciles that field with
the server balance. Pending payments already reduce the available balance;
the user does not have to wait for confirmation before paying the remainder.

Example: two receipts of RM20 and RM40, with neither specifically selected.
A successful RM45 payment applies RM20 to the first and RM25 to the second.
The amount textbox becomes **RM15.00**. The RM45 payment remains awaiting
confirmation when recorded by the payer.

An ordinary background refresh preserves a valid unsaved amount. If another
payment reduces the balance below that amount, the textbox resets to the new
available balance instead of keeping a stale over-limit amount. Typing alone
does not deduct money. A failed save does not trigger the successful-payment
reset. Existing submission locking and server validation remain in place.

Verification: 324 automated tests passed; 4 database integration tests skipped.
The new component tests cover FIFO allocation, immediate and refreshed field
values, a concurrent balance change, unsaved input and full payment.
No real-device or production-database test was performed.

Deploy the complete source package using DEPLOY-VERCEL.md. No SQL migration or
database reset is required. The changes are not deployed automatically.
