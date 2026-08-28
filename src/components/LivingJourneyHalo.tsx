"use client";

import { useMemo, useState } from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { formatMoney } from "@/lib/money";

type JourneyMode = "move" | "plan" | "spend" | "people";

type LivingJourneyHaloProps = {
  initialMode: JourneyMode;
  stage: "BEFORE" | "DURING" | "AFTER" | "CLOSED";
  nextTitle: string;
  nextMeta: string;
  destinationCount: number;
  todayItemCount: number;
  openTaskCount: number;
  todayMyShare: number;
  todayGroupSpend: number;
  dailyAllowance: number;
  projectedSpend: number;
  myRemaining: number;
  baseCurrency: string;
  travelerCount: number;
  unreadCount: number;
  iOwe: number;
  waitingForMe: number;
  closed: boolean;
};

const modeOrder: JourneyMode[] = ["move", "plan", "spend", "people"];

const modeLabel: Record<JourneyMode, string> = {
  move: "Move",
  plan: "Plan",
  spend: "Spend",
  people: "People",
};

function stageLabel(stage: LivingJourneyHaloProps["stage"]): string {
  if (stage === "BEFORE") return "Getting ready";
  if (stage === "DURING") return "Happening now";
  if (stage === "CLOSED") return "Journey complete";
  return "Wrapping up";
}

export function LivingJourneyHalo(props: LivingJourneyHaloProps) {
  const [activeMode, setActiveMode] = useState<JourneyMode>(props.initialMode);

  const content = useMemo(() => ({
    move: {
      eyebrow: "MOVE · WHAT IS NEXT",
      title: props.nextTitle,
      summary: props.nextMeta,
      insight: `${props.destinationCount} destination${props.destinationCount === 1 ? "" : "s"} connected to this journey.`,
      primaryHref: "/location",
      primaryLabel: "Open live map",
      secondaryHref: "/documents",
      secondaryLabel: "Tickets & documents",
      metrics: [
        ["Route", props.nextTitle === "No upcoming plan" ? "Ready to build" : "Next stop ready"],
        ["Trip stage", stageLabel(props.stage)],
        ["Offline", "Trip pack available"],
      ],
    },
    plan: {
      eyebrow: "PLAN · TODAY'S RHYTHM",
      title: props.todayItemCount > 0
        ? `${props.todayItemCount} plan item${props.todayItemCount === 1 ? "" : "s"} today`
        : "Shape the day together",
      summary: props.todayItemCount > 0
        ? `Next up: ${props.nextTitle}`
        : "Add the first activity and everyone sees the same plan.",
      insight: `${props.openTaskCount} open task${props.openTaskCount === 1 ? "" : "s"} or packing item${props.openTaskCount === 1 ? "" : "s"}.`,
      primaryHref: "/planner",
      primaryLabel: "Open today's plan",
      secondaryHref: "/companion",
      secondaryLabel: "Ask Trip Companion",
      metrics: [
        ["Today", `${props.todayItemCount} item${props.todayItemCount === 1 ? "" : "s"}`],
        ["Ready to go", `${props.openTaskCount} open`],
        ["Next", props.nextMeta],
      ],
    },
    spend: {
      eyebrow: "SPEND · TRIP WALLET",
      title: formatMoney(props.todayMyShare, props.baseCurrency),
      summary: `Your share today · group total ${formatMoney(props.todayGroupSpend, props.baseCurrency)}.`,
      insight: props.myRemaining < 0
        ? `You are ${formatMoney(Math.abs(props.myRemaining), props.baseCurrency)} above your personal budget.`
        : `${formatMoney(props.myRemaining, props.baseCurrency)} remains in your personal budget.`,
      primaryHref: props.closed ? "/expenses" : "/expenses/new",
      primaryLabel: props.closed ? "View expenses" : "Add quick expense",
      secondaryHref: "/settlements",
      secondaryLabel: "Review settlement",
      metrics: [
        ["Daily allowance", formatMoney(props.dailyAllowance, props.baseCurrency)],
        ["Projected", formatMoney(props.projectedSpend, props.baseCurrency)],
        ["To settle", formatMoney(props.iOwe, props.baseCurrency)],
      ],
    },
    people: {
      eyebrow: "PEOPLE · TRAVEL TOGETHER",
      title: `${props.travelerCount} traveler${props.travelerCount === 1 ? "" : "s"} connected`,
      summary: props.unreadCount > 0
        ? `${props.unreadCount} update${props.unreadCount === 1 ? "" : "s"} need your attention.`
        : "Your travel crew is up to date.",
      insight: props.waitingForMe > 0
        ? `${formatMoney(props.waitingForMe, props.baseCurrency)} is waiting for your received confirmation.`
        : "Location, activity and money stay connected to the same trip.",
      primaryHref: "/location",
      primaryLabel: "Find the crew",
      secondaryHref: "/notifications",
      secondaryLabel: "Group updates",
      metrics: [
        ["Travelers", String(props.travelerCount)],
        ["Updates", String(props.unreadCount)],
        ["Confirm", formatMoney(props.waitingForMe, props.baseCurrency)],
      ],
    },
  }), [props]);

  const active = content[activeMode];

  return (
    <section className={`living-journey-shell mode-${activeMode}`} aria-labelledby="living-journey-title">
      <div className="living-journey-heading">
        <div>
          <p className="eyebrow">TRIP COMMAND CENTRE</p>
          <h2 id="living-journey-title">Everything connected. One trip.</h2>
          <p>Tap the Halo to see what matters now—without searching through the app.</p>
        </div>
        <span className={`journey-stage ${props.stage.toLowerCase()}`}>
          <i aria-hidden="true" />
          {stageLabel(props.stage)}
        </span>
      </div>

      <div className="living-journey-grid">
        <div className="journey-halo">
          <span className="journey-orbit orbit-one" aria-hidden="true" />
          <span className="journey-orbit orbit-two" aria-hidden="true" />
          <span className="journey-orbit orbit-three" aria-hidden="true" />

          <div className="journey-halo-core" aria-live="polite">
            <span>{active.eyebrow.split(" · ")[0]}</span>
            <strong>{active.title}</strong>
            <small>{activeMode === "move" ? active.summary : "Tap for meaningful detail"}</small>
          </div>

          <div className="journey-mode-switcher" role="tablist" aria-label="Trip command areas">
            {modeOrder.map((mode) => (
              <button
                key={mode}
                className={`journey-mode journey-mode-${mode}`}
                type="button"
                role="tab"
                id={`living-journey-tab-${mode}`}
                aria-selected={activeMode === mode}
                aria-controls={`living-journey-panel-${mode}`}
                onPointerDown={() => setActiveMode(mode)}
                onClick={() => setActiveMode(mode)}
              >
                <b>{modeLabel[mode]}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="journey-panel-stack">
          {modeOrder.map((mode) => {
            const item = content[mode];
            const selected = activeMode === mode;

            return (
              <div
                aria-hidden={!selected}
                aria-labelledby={`living-journey-tab-${mode}`}
                className={`journey-live-panel${selected ? " is-active" : ""}`}
                data-mode={mode}
                id={`living-journey-panel-${mode}`}
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
                  <Link className="button journey-primary" href={item.primaryHref}>
                    {item.primaryLabel}
                    <span aria-hidden="true">↗</span>
                  </Link>
                  <Link className="button journey-secondary" href={item.secondaryHref}>
                    {item.secondaryLabel}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
