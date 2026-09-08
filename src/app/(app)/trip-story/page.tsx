import { FullPageLink as Link } from "@/components/FullPageLink";

export default function TripStoryPage() {
  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TRIP STORY</p>
          <h1>Memories & highlights</h1>
          <p className="muted">
            Capture moments during the trip, then revisit the finished story.
          </p>
        </div>
      </div>

      <section className="hub-choice-grid">
        <Link className="panel hub-choice-card" href="/memories">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>Memories</strong>
            <small>Photos, places and notes captured during the trip.</small>
          </div>
          <b>›</b>
        </Link>

        <Link className="panel hub-choice-card" href="/wrapped">
          <span aria-hidden="true">◌</span>
          <div>
            <strong>Trip Wrapped</strong>
            <small>Highlights and trip stats after the journey.</small>
          </div>
          <b>›</b>
        </Link>
      </section>
    </div>
  );
}
