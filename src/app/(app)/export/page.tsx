import { FullPageLink as Link } from "@/components/FullPageLink";
import { requirePageSession } from "@/lib/session";

export default async function ExportPage() {
  await requirePageSession();

  return (
    <div className="stack gap-lg export-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PHASE 8 · BACKUP</p>
          <h1>Export trip data</h1>
          <p className="muted">
            Download the active trip,
            including its accessible destinations, expenses, planner items and settlements.
          </p>
        </div>
      </div>

      <section className="content-grid export-grid">
        <article className="panel export-card">
          <span className="export-icon" aria-hidden="true">
            {"{ }"}
          </span>
          <div>
            <h2>JSON backup</h2>
            <p className="muted">
              Complete structured export for backup or future import tools.
            </p>
          </div>
          <Link
            className="button primary"
            href="/api/export?format=json"
            download
          >
            Download JSON
          </Link>
        </article>

        <article className="panel export-card">
          <span className="export-icon" aria-hidden="true">
            CSV
          </span>
          <div>
            <h2>CSV spreadsheet</h2>
            <p className="muted">
              One flattened file containing expense, planner and settlement rows.
            </p>
          </div>
          <Link
            className="button secondary"
            href="/api/export?format=csv"
            download
          >
            Download CSV
          </Link>
        </article>
      </section>

      <section className="info-card">
        <strong>Access-safe export</strong>
        <p>
          The export only contains destinations you can access inside the active trip selected from Home.
        </p>
      </section>
    </div>
  );
}
