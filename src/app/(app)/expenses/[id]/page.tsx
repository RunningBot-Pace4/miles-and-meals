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
  const [expense] = await db.select({ id: expenses.id, description: expenses.description, countryId: expenses.countryId, tripId: expenses.tripId, expenseDate: expenses.expenseDate, baseCurrency: expenses.baseCurrency }).from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!expense || !(await canAccessCountry(session.user, expense.countryId))) notFound();
  const [ledger, capabilities, shares] = await Promise.all([
    buildCountrySettlementLedger(expense.countryId),
    getTripCapabilities(session.user, expense.tripId),
    db.select({ name: user.name, amount: expenseSplits.shareAmountBase }).from(expenseSplits).innerJoin(user, eq(user.id, expenseSplits.userId)).where(eq(expenseSplits.expenseId, id)),
  ]);
  if (!ledger) notFound();
  const bills = ledger.smartPlan.originalExpenseBalances.flatMap(balance => balance.expenses).filter(bill => bill.expenseId === id);
  const payments = ledger.smartPlan.recordedPayments.filter(payment => payment.allocations.some(a => a.expenseId === id));
  return <div className="stack gap-lg">
    <div className="page-heading"><div><p className="eyebrow">BILL DETAILS</p><h1>{expense.description}</h1><p>{expense.expenseDate} · {ledger.tripName}</p></div><Link href="/spend">Back to Spend</Link></div>
    <section className="panel"><ReceiptViewerButton expenseId={id} /><h2>Each traveler's share</h2>{shares.map((share, index) => <p key={index}>{share.name} · {formatMoney(Number(share.amount), expense.baseCurrency)}</p>)}</section>
    <section className="panel stack"><h2>Bill payment progress</h2><p>Pending transfers are reserved to prevent paying twice. They become confirmed only after receipt is acknowledged. Unassigned transfers and group offsets are not attributed to this bill. Check the person statement before paying: the amount still uncovered on this bill can differ from the actual balance due.</p>
      {bills.map(bill => <article key={`${bill.participantUserId}-${bill.payerUserId}`}><h3>{bill.participantName} → {bill.payerName}</h3><BillPaymentProgress bill={bill} payments={ledger.smartPlan.recordedPayments} /><Link href={`/settlements/statement?countryId=${encodeURIComponent(expense.countryId)}&fromUserId=${encodeURIComponent(bill.participantUserId)}&toUserId=${encodeURIComponent(bill.payerUserId)}`}>View statement & pay selected bills</Link></article>)}
      {!bills.length && <p>No reimbursement is due between different travellers for this bill.</p>}
    </section>
    <section className="panel stack"><h2>Payment history for this bill</h2>{payments.map(payment => <article className="panel" key={payment.id}>
      <h3>{payment.fromName} → {payment.toName}</h3><p>{new Date(payment.sentAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} · {payment.status === "SENT" ? "Awaiting confirmation" : payment.status}</p>
      {payment.confirmedAt && <p>Received: {new Date(payment.confirmedAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</p>}
      {payment.reversedAt && <p>Cancelled/reversed: {new Date(payment.reversedAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</p>}
      <p>Assigned to this bill: {formatMoney(payment.allocations.filter(a => a.expenseId === id).reduce((sum, a) => sum + a.amount, 0), payment.currency)} · Transfer total: {formatMoney(payment.amount, payment.currency)}</p>
      <p>{payment.paymentMethod?.replaceAll("_", " ")}{payment.paymentReference ? ` · ${payment.paymentReference}` : ""}</p>{payment.paymentNote && <p>{payment.paymentNote}</p>}{payment.reversalReason && <p>Reason: {payment.reversalReason}</p>}
      {payment.paymentProofAvailable && (capabilities.canManage || [payment.fromUserId, payment.toUserId].includes(session.user.id)) && <a href={`/api/settlements/${payment.id}/proof`} target="_blank" rel="noreferrer">View payment proof</a>}
    </article>)}{!payments.length && <p>No payments have been assigned to this bill.</p>}</section>
  </div>;
}
