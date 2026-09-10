import { BillSettlementAllocator } from "@/components/BillSettlementAllocator";
import { PageLiveRefresh } from "@/components/PageLiveRefresh";
import { getTripFinancialState } from "@/lib/financial-close";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { expenses, expenseSplits, user } from "@/db/schema";
import { requirePageSession } from "@/lib/session";
import { canAccessCountry } from "@/lib/access";
import { buildCountrySettlementLedger } from "@/lib/settlement-ledger";
import { formatMoney } from "@/lib/money";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { ReceiptViewerButton } from "@/components/ReceiptViewerButton";
import { BillPaymentProgress } from "@/components/BillPaymentProgress";
import { FullPageLink as Link } from "@/components/FullPageLink";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const [expense] = await db.select({ id: expenses.id, description: expenses.description, countryId: expenses.countryId, tripId: expenses.tripId, expenseDate: expenses.expenseDate, baseCurrency: expenses.baseCurrency, receiptUrl: expenses.receiptUrl }).from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!expense || !(await canAccessCountry(session.user, expense.countryId))) notFound();
  const [ledger, capabilities, shares] = await Promise.all([
    buildCountrySettlementLedger(expense.countryId),
    getTripCapabilities(session.user, expense.tripId),
    db.select({ name: user.name, amount: expenseSplits.shareAmountBase }).from(expenseSplits).innerJoin(user, eq(user.id, expenseSplits.userId)).where(eq(expenseSplits.expenseId, id)),
  ]);
  if (!ledger) notFound();
  const financialState = await getTripFinancialState(expense.tripId);
  const bills = ledger.smartPlan.originalExpenseBalances.flatMap(balance => balance.expenses).filter(bill => bill.expenseId === id);
  const payments = ledger.smartPlan.recordedPayments.filter(payment => payment.allocations.some(a => a.expenseId === id));
  return <div className="stack gap-lg bill-detail-page"><PageLiveRefresh />
    <div className="page-heading"><div><p className="eyebrow">BILL &amp; PAYMENTS</p><h1>{expense.description}</h1><p>{expense.expenseDate} · {ledger.tripName}</p></div><Link className="button secondary" href="/spend">Back to Spend</Link></div>
    <section className="panel bill-detail-overview">
      <div className="bill-detail-sharing">
        <div className="bill-detail-section-title">
          <span className="bill-detail-section-icon" aria-hidden="true">👥</span>
          <div><p className="eyebrow">SPLIT BETWEEN</p><h2>Who shares this bill</h2><small>Each person&apos;s original share before payments.</small></div>
        </div>
        <div className="bill-share-chips">
          {shares.map((share, index) => (
            <span key={index}>
              <b aria-hidden="true">{share.name.trim().charAt(0).toUpperCase()}</b>
              <span>{share.name}<small>Share</small></span>
              <strong>{formatMoney(Number(share.amount), expense.baseCurrency)}</strong>
            </span>
          ))}
        </div>
      </div>
      <aside className={expense.receiptUrl ? "bill-receipt-status attached" : "bill-receipt-status empty"}>
        <span aria-hidden="true">{expense.receiptUrl ? "✓" : "◇"}</span>
        <div>
          <small>RECEIPT</small>
          <strong>{expense.receiptUrl ? "Receipt attached" : "No receipt added"}</strong>
        </div>
        {expense.receiptUrl ? <ReceiptViewerButton expenseId={id} /> : <small>This expense was saved without a receipt.</small>}
      </aside>
    </section>
    <section className="panel stack bill-detail-progress"><div className="panel-title"><div><p className="eyebrow">BALANCE</p><h2>Payment progress</h2></div></div><p className="bill-detail-note">Pending money is reserved until the receiver confirms it. Receipt balances and person-level offsets are kept separate for accuracy.</p>
      {bills.map(bill => <article className="bill-detail-obligation" key={`${bill.participantUserId}-${bill.payerUserId}`}><div className="bill-detail-obligation-head"><div><span className="bill-route-icon" aria-hidden="true">↗</span><h3>{bill.participantName} → {bill.payerName}</h3></div><Link className="button secondary" href={`/settlements/statement?countryId=${encodeURIComponent(expense.countryId)}&fromUserId=${encodeURIComponent(bill.participantUserId)}&toUserId=${encodeURIComponent(bill.payerUserId)}`}>Person statement</Link></div><BillPaymentProgress bill={bill} payments={ledger.smartPlan.recordedPayments} />
        {financialState?.status !== "CLOSED" && <details className="bill-payment-disclosure"><summary><span>Record payment</span><small>Full or partial</small></summary><BillSettlementAllocator countryId={expense.countryId} currentUserId={session.user.id} fromUserId={bill.participantUserId} fromName={bill.participantName} toUserId={bill.payerUserId} toName={bill.payerName} currency={bill.currency} directRemaining={ledger.smartPlan.originalExpenseBalances.find(balance => balance.fromUserId === bill.participantUserId && balance.toUserId === bill.payerUserId)?.directRemaining ?? 0} hasPendingPayment={ledger.smartPlan.recordedPayments.some(payment => payment.status === "SENT" && payment.fromUserId === bill.participantUserId && payment.toUserId === bill.payerUserId)} expenses={[bill]} /></details>}
      </article>)}
      {!bills.length && <div className="settled-state"><span aria-hidden="true">✓</span><div><strong>No reimbursement due</strong><small>This bill does not create a balance between travellers.</small></div></div>}
    </section>
    <section className="panel stack bill-detail-history"><div className="panel-title"><div><p className="eyebrow">HISTORY</p><h2>Payments for this bill</h2></div><span>{payments.length}</span></div>{payments.map(payment => <article className="bill-history-card" key={payment.id}>
      <h3>{payment.fromName} → {payment.toName}</h3><p>{new Date(payment.sentAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} · {payment.status === "SENT" ? "Awaiting confirmation" : payment.status}</p>
      {payment.confirmedAt && <p>Received: {new Date(payment.confirmedAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</p>}
      {payment.reversedAt && <p>Cancelled/reversed: {new Date(payment.reversedAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</p>}
      <p>Assigned to this bill: {formatMoney(payment.allocations.filter(a => a.expenseId === id).reduce((sum, a) => sum + a.amount, 0), payment.currency)} · Transfer total: {formatMoney(payment.amount, payment.currency)}</p>
      <p>{payment.paymentMethod?.replaceAll("_", " ")}{payment.paymentReference ? ` · ${payment.paymentReference}` : ""}</p>{payment.paymentNote && <p>{payment.paymentNote}</p>}{payment.reversalReason && <p>Reason: {payment.reversalReason}</p>}
      {payment.paymentProofAvailable && (capabilities.canManage || [payment.fromUserId, payment.toUserId].includes(session.user.id)) && <a href={`/api/settlements/${payment.id}/proof`} target="_blank" rel="noreferrer">View payment proof</a>}
    </article>)}{!payments.length && <div className="bill-history-empty"><span aria-hidden="true">◇</span><strong>No payments yet</strong><small>Payments assigned to this receipt will appear here.</small></div>}</section>
  </div>;
}
