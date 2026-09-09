import { billPaymentProgress } from "@/lib/bill-payment-progress";
import { formatMoney } from "@/lib/money";
import type { SmartSettlementExpenseLine, SmartSettlementPaymentLine } from "@/lib/settlement-ledger";

export function BillPaymentProgress({ bill, payments }: { bill: SmartSettlementExpenseLine; payments: SmartSettlementPaymentLine[] }) {
  const progress = billPaymentProgress(bill, payments);
  return <div className="bill-progress">
    <dl>
      <div><dt>Original share</dt><dd>{formatMoney(bill.shareAmount, bill.currency)}</dd></div>
      <div><dt>Confirmed paid</dt><dd>{formatMoney(progress.confirmed, bill.currency)}</dd></div>
      <div><dt>Awaiting confirmation</dt><dd>{formatMoney(progress.pending, bill.currency)}</dd></div>
      <div><dt>Still to pay</dt><dd>{formatMoney(progress.stillToPay, bill.currency)}</dd></div>
    </dl>
    <strong>{progress.status}</strong>
  </div>;
}
