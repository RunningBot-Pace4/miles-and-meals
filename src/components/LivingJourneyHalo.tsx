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

const modeIcon: Record<JourneyMode, string> = {
  move: "↗",
  plan: "⌁",
  spend: "◈",
  people: "◎",
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
          <p className="eyebrow">LIVING JOURNEY · TRIP COMMAND CENTRE</p>
          <h2 id="living-journey-title">Everything connected. One journey.</h2>
          <p>Tap the Halo to see what matters now—without searching through the app.</p>
        </div>
        <span className={`journey-stage ${props.stage.toLowerCase()}`}>
          <i aria-hidden="true" />
          {stageLabel(props.stage)}
        </span>
      </div>

      <div className="living-journey-grid">
        <div className="journey-halo" role="tablist" aria-label="Living Journey areas">
          <span className="journey-orbit orbit-one" aria-hidden="true" />
          <span className="journey-orbit orbit-two" aria-hidden="true" />
          <span className="journey-orbit orbit-three" aria-hidden="true" />

          <div className="journey-halo-core" aria-live="polite">
            <img src="/icons/icon-512.png" width="174" height="174" alt="" />
            <span>{modeLabel[activeMode]}</span>
            <strong>{activeMode === "spend" ? active.title : "What matters now?"}</strong>
          </div>

          {modeOrder.map((mode) => (
            <button
              key={mode}
              className={`journey-mode journey-mode-${mode}${activeMode === mode ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeMode === mode}
              aria-controls="living-journey-panel"
              onClick={() => setActiveMode(mode)}
            >
              <span aria-hidden="true">{modeIcon[mode]}</span>
              <b>{modeLabel[mode]}</b>
            </button>
          ))}
        </div>

        <div className="journey-live-panel" id="living-journey-panel" role="tabpanel">
          <p className="eyebrow">{active.eyebrow}</p>
          <h3>{active.title}</h3>
          <p className="journey-live-summary">{active.summary}</p>
          <p className="journey-live-insight">
            <span aria-hidden="true">✦</span>
            {active.insight}
          </p>

          <dl className="journey-metrics">
            {active.metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="journey-live-actions">
            <Link className="button journey-primary" href={active.primaryHref}>
              {active.primaryLabel}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button journey-secondary" href={active.secondaryHref}>
              {active.secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
