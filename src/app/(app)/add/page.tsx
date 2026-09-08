import { FullPageLink as Link } from "@/components/FullPageLink";

export default function AddPage() {
  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADD</p>
          <h1>Add to the trip</h1>
          <p className="muted">
            Choose what you want to capture without hunting through More.
          </p>
        </div>
      </div>

      <section className="hub-choice-grid add-hub-grid">
        <Link className="panel hub-choice-card" href="/expenses/new">
          <span aria-hidden="true">＋</span>
          <div>
            <strong>Expense</strong>
            <small>Add a bill, receipt, payer and split.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel hub-choice-card" href="/planner?add=1">
          <span aria-hidden="true">□</span>
          <div>
            <strong>Plan item</strong>
            <small>Add or edit something in the itinerary.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel hub-choice-card" href="/memories">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>Memory</strong>
            <small>Capture a photo, place or trip moment.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel hub-choice-card" href="/documents">
          <span aria-hidden="true">▤</span>
          <div>
            <strong>Document</strong>
            <small>Store a booking, travel document or emergency detail.</small>
          </div>
          <b>›</b>
        </Link>
      </section>
    </div>
  );
}
