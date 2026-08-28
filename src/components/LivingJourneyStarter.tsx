"use client";

import { useMemo, useState } from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";

type StarterMode = "move" | "plan" | "spend" | "people";

const modes: StarterMode[] = ["move", "plan", "spend", "people"];

const labels: Record<StarterMode, string> = {
  move: "Move",
  plan: "Plan",
  spend: "Spend",
  people: "People",
};

export function LivingJourneyStarter({ isAdmin }: { isAdmin: boolean }) {
  const [activeMode, setActiveMode] = useState<StarterMode>("plan");

  const content = useMemo(() => ({
    move: {
      eyebrow: "MOVE · FROM HERE TO THERE",
      title: "Know what comes next.",
      summary: "Routes, transport, tickets and offline essentials stay connected to the same Trip.",
      insight: "Create a Trip first, then the Halo becomes your live movement view.",
      metrics: [["Routes", "One tap"], ["Tickets", "Together"], ["Offline", "Ready"]],
    },
    plan: {
      eyebrow: "PLAN · SHAPE THE JOURNEY",
      title: "Turn ideas into a shared day.",
      summary: "Build the itinerary, organise activities and keep the whole crew aligned.",
      insight: "Your first step is simple: choose a destination and Trip dates.",
      metrics: [["Itinerary", "Day by day"], ["Tasks", "Shared"], ["Calendar", "Connected"]],
    },
    spend: {
      eyebrow: "SPEND · NO MONEY ARGUMENTS",
      title: "Spend together. Settle fairly.",
      summary: "Capture receipts, split expenses and always understand who owes whom.",
      insight: "Budget, currencies and Smart Settlement activate with your Trip.",
      metrics: [["Expenses", "Fast entry"], ["Splits", "Flexible"], ["Settlement", "Simplified"]],
    },
    people: {
      eyebrow: "PEOPLE · TRAVEL TOGETHER",
      title: "One Trip. Everyone connected.",
      summary: "Invite your crew and share the plan, updates, locations and costs with clear permissions.",
      insight: "You stay in control while every traveller sees what matters to them.",
      metrics: [["Invites", "Secure"], ["Roles", "Controlled"], ["Updates", "In sync"]],
    },
  }), []);

  const active = content[activeMode];

  return (
    <section className={`living-journey-shell living-journey-starter mode-${activeMode}`} aria-labelledby="living-journey-starter-title">
      <div className="living-journey-heading">
        <div>
          <p className="eyebrow">YOUR TRIP COMMAND CENTRE</p>
          <h2 id="living-journey-starter-title">Four travel systems. One connected trip.</h2>
          <p>Tap the Halo to discover how Miles &amp; Meals works before creating your first Trip.</p>
        </div>
        <span className="journey-stage before">
          <i aria-hidden="true" />
          Ready to begin
        </span>
      </div>

      <div className="living-journey-grid">
        <div className="journey-halo starter-halo">
          <span className="journey-orbit orbit-one" aria-hidden="true" />
          <span className="journey-orbit orbit-two" aria-hidden="true" />
          <span className="journey-orbit orbit-three" aria-hidden="true" />

          <div className="journey-halo-core" aria-live="polite">
            <span>{active.eyebrow.split(" · ")[0]}</span>
            <strong>Start your journey</strong>
            <small>Create a Trip to connect live data</small>
          </div>

          <div className="journey-mode-switcher" role="tablist" aria-label="Trip command introduction">
            {modes.map((mode) => (
              <button
                key={mode}
                className={`journey-mode journey-mode-${mode}`}
                type="button"
                role="tab"
                id={`living-journey-starter-tab-${mode}`}
                aria-selected={activeMode === mode}
                aria-controls={`living-journey-starter-panel-${mode}`}
                onPointerDown={() => setActiveMode(mode)}
                onClick={() => setActiveMode(mode)}
              >
                <b>{labels[mode]}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="journey-panel-stack">
          {modes.map((mode) => {
            const item = content[mode];
            const selected = activeMode === mode;

            return (
              <div
                aria-hidden={!selected}
                aria-labelledby={`living-journey-starter-tab-${mode}`}
                className={`journey-live-panel starter-live-panel${selected ? " is-active" : ""}`}
                data-mode={mode}
                id={`living-journey-starter-panel-${mode}`}
                key={mode}
                role="tabpanel"
              >
                <p className="eyebrow">{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p className="journey-live-summary">{item.summary}</p>
                <p className="journey-live-insight">
                  <span aria-hidden="true">✦</span>
                  {item.insight}
                </p>

                <dl className="journey-metrics">
                  {item.metrics.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="journey-live-actions">
                  <Link className="button journey-primary" href="/trips">
                    Create my first Trip
                    <span aria-hidden="true">↗</span>
                  </Link>
                  {isAdmin ? (
                    <Link className="button journey-secondary" href="/admin">System Admin</Link>
                  ) : (
                    <span className="starter-invite-note">Have an invite? Open its secure link to join.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ol className="journey-start-steps" aria-label="How to begin">
        <li><span>1</span><strong>Create</strong><small>Destination and dates</small></li>
        <li><span>2</span><strong>Invite</strong><small>Bring your travel crew</small></li>
        <li><span>3</span><strong>Go live</strong><small>The Halo uses real Trip data</small></li>
      </ol>
    </section>
  );
}
