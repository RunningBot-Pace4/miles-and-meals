import { FullPageLink as Link } from "@/components/FullPageLink";

export default function UpdatesPage() {
  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">UPDATES</p>
          <h1>What happened</h1>
          <p className="muted">
            Personal alerts and the shared trip activity trail are grouped here.
          </p>
        </div>
      </div>

      <section className="hub-choice-grid">
        <Link className="panel hub-choice-card" href="/notifications">
          <span aria-hidden="true">●</span>
          <div>
            <strong>For me</strong>
            <small>Invites, payment confirmations and items needing your attention.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel hub-choice-card" href="/activity">
          <span aria-hidden="true">↻</span>
          <div>
            <strong>All activity</strong>
            <small>Expense, itinerary and collaboration changes across the trip.</small>
          </div>
          <b>›</b>
        </Link>
      </section>
    </div>
  );
}
