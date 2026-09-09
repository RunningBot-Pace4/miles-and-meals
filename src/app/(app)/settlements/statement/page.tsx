import { FullPageLink as Link } from "@/components/FullPageLink";
import { BillPaymentProgress } from "@/components/BillPaymentProgress";
import { BillSettlementAllocator } from "@/components/BillSettlementAllocator";
import { canAccessCountry } from "@/lib/access";
import { formatMoney } from "@/lib/money";
import { requirePageSession } from "@/lib/session";
import { buildCountrySettlementLedger } from "@/lib/settlement-ledger";

type PersonStatementPageProps = {
  searchParams: Promise<{
    countryId?: string;
    fromUserId?: string;
    toUserId?: string;
  }>;
};

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function paymentMethodLabel(value: string | null): string {
  if (value === "DUITNOW") return "DuitNow";
  if (value === "BANK_TRANSFER") return "Bank transfer";
  if (value === "TOUCH_N_GO") return "Touch 'n Go";
  if (value === "CASH") return "Cash";
  if (value === "CARD") return "Card";
  if (value === "OTHER") return "Other";
  return "Method not specified";
}

export default async function PersonStatementPage({
  searchParams,
}: PersonStatementPageProps) {
  const session = await requirePageSession();
  const query = await searchParams;
  const countryId = query.countryId ?? "";
  const fromUserId = query.fromUserId ?? "";
  const toUserId = query.toUserId ?? "";

  if (
    !countryId ||
    !fromUserId ||
    !toUserId ||
    !(await canAccessCountry(session.user, countryId))
  ) {
    return (
      <div className="stack gap-lg person-statement-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PERSON STATEMENT</p>
            <h1>Statement unavailable</h1>
            <p className="muted">
              Choose a traveler relationship from Settle Up to view its statement.
            </p>
          </div>
        </div>
        <Link className="button" href="/settlements">
          Back to Settle Up
        </Link>
      </div>
    );
  }

  const ledger = await buildCountrySettlementLedger(countryId);
  const balance = ledger?.smartPlan.originalExpenseBalances.find(
    (candidate) =>
      candidate.fromUserId === fromUserId &&
      candidate.toUserId === toUserId,
  );

  if (!ledger || !balance) {
    return (
      <div className="stack gap-lg person-statement-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PERSON STATEMENT</p>
            <h1>No direct statement</h1>
            <p className="muted">
              This traveler pair does not have a direct expense relationship in the selected destination.
            </p>
          </div>
        </div>
        <Link
          className="button"
          href={ledger ? `/settlements?tripId=${ledger.tripId}` : "/settlements"}
        >
          Back to Settle Up
        </Link>
      </div>
    );
  }

  const payments = ledger.smartPlan.recordedPayments
    .filter(
      (payment) =>
        payment.fromUserId === fromUserId &&
        payment.toUserId === toUserId,
    )
    .sort(
      (left, right) =>
        new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime(),
    );
  const hasPendingPayment = payments.some(
    (payment) => payment.status === "SENT",
  );

  return (
    <div className="stack gap-lg person-statement-page">
      <div className="page-heading person-statement-heading">
        <div>
          <p className="eyebrow">PERSON STATEMENT</p>
          <h1>
            {balance.fromName} → {balance.toName}
          </h1>
          <p className="muted">
            {ledger.tripName} · {ledger.countryName} · direct bills and payment history
          </p>
        </div>
        <Link
          className="button settlement-action-secondary"
          href={`/settlements?tripId=${encodeURIComponent(ledger.tripId)}`}
        >
          Back to Settle Up
        </Link>
      </div>

      <section className="panel person-statement-summary">
        <div>
          <span>Original bills</span>
          <strong>{formatMoney(balance.amount, ledger.currency)}</strong>
        </div>
        <div>
          <span>Active direct payments</span>
          <strong>{formatMoney(balance.directPaid, ledger.currency)}</strong>
        </div>
        <div>
          <span>Bill payments recorded (including pending)</span>
          <strong>{formatMoney(balance.allocatedPaid, ledger.currency)}</strong>
        </div>
        <div>
          <span>Outstanding</span>
          <strong>{formatMoney(balance.directRemaining, ledger.currency)}</strong>
        </div>
      </section>

      {balance.unallocatedDirectPaid > 0.009 ? (
        <section className="panel person-statement-disclosure">
          <strong>
            {formatMoney(balance.unallocatedDirectPaid, ledger.currency)} is not assigned to a specific bill
          </strong>
          <p>
            Older or Smart Settlement payments can reduce the direct balance without naming a receipt.
            Miles &amp; Meals keeps that amount separate instead of guessing which bill it covered.
          </p>
        </section>
      ) : null}

      <section className="panel person-statement-section">
        <div className="panel-title">
          <div>
            <p className="eyebrow">BILLS</p>
            <h2>What makes up this balance</h2>
          </div>
          <span>{balance.expenseCount} bill{balance.expenseCount === 1 ? "" : "s"}</span>
        </div>

        <div className="person-statement-bills">
          {balance.expenses.map((expense) => (
            <article
              className="person-statement-bill"
              key={`${expense.expenseId}-${expense.participantUserId}-${expense.payerUserId}`}
            >
              <div>
                <strong>{expense.description}</strong>
                <small>
                  {formatDate(expense.expenseDate)} · {expense.category}
                </small>
                <small>
                  {expense.participantName}&apos;s share · paid by {expense.payerName}
                </small>
              </div>
              <BillPaymentProgress bill={expense} payments={payments} />
              <Link
                className="smart-proof-link"
                href={`/expenses/${expense.expenseId}`}
              >
                View bill & payment history
              </Link>
            </article>
          ))}
        </div>

        <BillSettlementAllocator
          countryId={ledger.countryId}
          currentUserId={session.user.id}
          directRemaining={balance.directRemaining}
          expenses={balance.expenses}
          fromName={balance.fromName}
          fromUserId={balance.fromUserId}
          hasPendingPayment={hasPendingPayment}
          currency={ledger.currency}
          toName={balance.toName}
          toUserId={balance.toUserId}
        />
      </section>

      <section className="panel person-statement-section">
        <div className="panel-title">
          <div>
            <p className="eyebrow">PAYMENTS</p>
            <h2>Payment history</h2>
          </div>
          <span>{payments.length} payment{payments.length === 1 ? "" : "s"}</span>
        </div>

        <div className="person-statement-payments">
          {payments.length ? (
            payments.map((payment) => {
              const inactive =
                payment.status === "CANCELLED" ||
                payment.status === "REVERSED";

              return (
                <article
                  className={inactive ? "person-statement-payment inactive" : "person-statement-payment"}
                  key={payment.id}
                >
                  <div>
                    <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                    <small>
                      {formatDate(payment.sentAt)} · {payment.status === "SENT" ? "Awaiting confirmation" : payment.status}
                    </small>
                    <small>{paymentMethodLabel(payment.paymentMethod)}</small>
                    {payment.paymentReference ? (
                      <small>Reference · {payment.paymentReference}</small>
                    ) : null}
                    {payment.paymentNote ? (
                      <p>{payment.paymentNote}</p>
                    ) : null}
                  </div>

                  <div className="person-statement-payment-allocations">
                    {payment.allocations.length ? (
                      payment.allocations.map((allocation) => (
                        <span key={`${payment.id}-${allocation.expenseId}`}>
                          <span>{allocation.description}</span>
                          <strong>{formatMoney(allocation.amount, payment.currency)}</strong>
                        </span>
                      ))
                    ) : (
                      <small>Unassigned to a specific bill</small>
                    )}
                  </div>

                  {payment.paymentProofAvailable ? (
                    <a
                      className="button settlement-action-secondary"
                      href={`/api/settlements/${payment.id}/proof`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View payment proof
                    </a>
                  ) : null}

                  {inactive && payment.reversalReason ? (
                    <small className="settlement-reversal-meta">
                      {payment.status === "CANCELLED" ? "Cancelled" : "Reversed"} · {payment.reversalReason}
                    </small>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="muted">No direct payments have been recorded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
