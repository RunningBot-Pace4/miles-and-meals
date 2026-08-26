import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { ReceiptReviewButton } from "@/components/ReceiptReviewButton";
import { ReceiptViewerButton } from "@/components/ReceiptViewerButton";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { getActiveTripContext } from "@/lib/active-trip";
import { effectiveConvertedAmount, formatMoney } from "@/lib/money";
import { requirePageSession } from "@/lib/session";

export default async function ReceiptReviewPage() {
  const session = await requirePageSession();
  const active = await getActiveTripContext(session.user);
  const countryIds = active.countries.map((country) => country.id);
  const rows = countryIds.length ? await db
    .select()
    .from(expenses)
    .where(inArray(expenses.countryId, countryIds))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt)) : [];
  const receipts = rows.filter((expense) => Boolean(expense.receiptUrl));
  const locked = active.trips.find((trip) => trip.id === active.tripId)?.financialStatus === "CLOSED";
  const needsReview = receipts.filter((expense) => expense.receiptReviewStatus !== "REVIEWED");

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONEY · QUALITY CHECK</p>
          <h1>Receipt review</h1>
          <p className="muted">Open the receipt beside its extracted expense, correct anything through Edit, then confirm the review.</p>
        </div>
        <Link className="button secondary" href="/expenses">All expenses</Link>
      </div>

      <section className="receipt-review-summary">
        <article><strong>{receipts.length}</strong><span>Receipts</span></article>
        <article><strong>{needsReview.length}</strong><span>Need review</span></article>
        <article><strong>{receipts.filter((item) => item.receiptConfidence !== null && item.receiptConfidence < 70).length}</strong><span>Low confidence</span></article>
      </section>

      <section className="receipt-review-list">
        {receipts.length ? receipts.map((expense) => (
          <article className={expense.receiptReviewStatus === "REVIEWED" ? "receipt-review-row reviewed" : "receipt-review-row"} key={expense.id}>
            <div>
              <p className="eyebrow">{expense.expenseDate} · {expense.category}</p>
              <h2>{expense.description}</h2>
              <strong>{formatMoney(effectiveConvertedAmount(expense.convertedAmount, expense.actualConvertedAmount), expense.baseCurrency)}</strong>
              <small>
                {expense.receiptConfidence === null
                  ? "Manual receipt · confidence not available"
                  : `${expense.receiptConfidence}% extraction confidence`}
              </small>
            </div>
            <div className="receipt-review-row-actions">
              <ReceiptViewerButton expenseId={expense.id} />
              {!locked && expense.receiptReviewStatus !== "REVIEWED" ? <ReceiptReviewButton expenseId={expense.id} /> : null}
              {!locked ? <Link href={`/expenses/${expense.id}/edit`}>Edit expense</Link> : <span>Trip closed · view only</span>}
            </div>
          </article>
        )) : (
          <article className="empty-card"><h2>No receipts for this Trip</h2><p>Add a receipt when creating or editing an expense.</p></article>
        )}
      </section>
    </div>
  );
}
