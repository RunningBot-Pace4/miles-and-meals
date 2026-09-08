import { FullPageLink as Link } from "@/components/FullPageLink";

export default function SpendPage() {
  return (
    <div className="stack gap-lg spend-hub-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SPEND</p>
          <h1>Trip money</h1>
          <p className="muted">
            Expenses, receipts, budgets and settlements in one place.
          </p>
        </div>
        <Link className="button primary" href="/expenses/new">
          Add expense
        </Link>
      </div>

      <section className="spend-hub-grid" aria-label="Spend tools">
        <Link className="panel spend-hub-card" href="/expenses">
          <span aria-hidden="true">◎</span>
          <div>
            <strong>Expenses</strong>
            <small>Browse, search and review trip spending.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel spend-hub-card" href="/settlements">
          <span aria-hidden="true">↔</span>
          <div>
            <strong>Settle Up</strong>
            <small>See who owes whom, pay bills and review statements.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel spend-hub-card" href="/settings/budgets">
          <span aria-hidden="true">◫</span>
          <div>
            <strong>Budgets</strong>
            <small>Personal and category limits for the active trip.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel spend-hub-card" href="/receipts">
          <span aria-hidden="true">▤</span>
          <div>
            <strong>Receipt review</strong>
            <small>Check captured receipts and OCR results.</small>
          </div>
          <b>›</b>
        </Link>
      </section>

      <section className="panel spend-hub-note">
        <strong>One money model</strong>
        <p>
          Expenses create the obligations. Payments and bill allocations reduce
          those obligations without rewriting the original expense history.
        </p>
      </section>
    </div>
  );
}
