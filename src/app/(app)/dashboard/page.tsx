import { FullPageLink as Link } from "@/components/FullPageLink";
import { LiveDashboardFinance } from "@/components/LiveDashboardFinance";
import { LiveSettlementWorkspace } from "@/components/LiveSettlementWorkspace";
import { LivingJourneyHalo } from "@/components/LivingJourneyHalo";
import { LivingJourneyStarter } from "@/components/LivingJourneyStarter";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { buildExpenseSummary } from "@/lib/dashboard";
import { listActivityForUser } from "@/lib/activity";
import { loadAllTripsDashboardData } from "@/lib/dashboard-scope";
import { formatMoney } from "@/lib/money";
import { loadUnreadNotificationCount } from "@/lib/notification-count";
import {
  isSystemAdmin,
  requirePageSession,
} from "@/lib/session";
import { serializeSettlementLiveData } from "@/lib/settlement-live";
import {
  loadTripBudgetSummary,
} from "@/lib/trip-budget";
import { loadTripCommandCenter } from "@/lib/trip-command-center";
import { buildJourneyGreeting } from "@/lib/journey-greeting";

function formatTripDateRange(
  startDate:
    | string
    | null
    | undefined,
  endDate:
    | string
    | null
    | undefined,
): string {
  if (
    !startDate &&
    !endDate
  ) {
    return "Dates not set";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-MY",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );

  function format(
    value: string,
  ): string {
    const [
      year,
      month,
      day,
    ] = value
      .split("-")
      .map(Number);

    return formatter.format(
      new Date(
        year,
        month - 1,
        day,
      ),
    );
  }

  if (
    startDate &&
    endDate
  ) {
    return `${format(
      startDate,
    )} – ${format(endDate)}`;
  }

  return format(
    startDate ??
      endDate ??
      "",
  );
}

function malaysiaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function tripEndedAtLeastOneDayAgo(endDate: string | null | undefined): boolean {
  if (!endDate) {
    return false;
  }

  const today = malaysiaDateString();
  if (endDate >= today) {
    return false;
  }

  const end = new Date(`${endDate}T00:00:00+08:00`).getTime();
  const now = new Date(`${today}T00:00:00+08:00`).getTime();
  return now - end >= 24 * 60 * 60 * 1000;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
  }>;
}) {
  const query = await searchParams;
  const session =
    await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const tripOptions =
    activeTrip.trips;
  const viewAll =
    query.view !== "trip" &&
    tripOptions.length > 0;
  const requestedTripId =
    activeTrip.tripId;
  const selectedTrip =
    tripOptions.find(
      (trip) =>
        trip.id ===
        requestedTripId,
    ) ?? null;
  const selectedCountries =
    activeTrip.countries;
  const countryIds =
    selectedCountries.map(
      (country) => country.id,
    );

  const emptyBudget = {
    myBudget: 0,
    combinedBudget: 0,
    budgetsSubmitted: 0,
    travelerCount: 0,
    missingBudgetCount: 0,
  };
  const loadSelectedData = async () => {
    const [summary, budget] = await Promise.all([
      buildExpenseSummary(countryIds),
      requestedTripId
        ? loadTripBudgetSummary(
            session.user.id,
            requestedTripId,
            countryIds,
          )
        : Promise.resolve(emptyBudget),
    ]);

    return { summary, budget };
  };
  const allTripsDataPromise = viewAll
    ? loadAllTripsDashboardData(
        session.user.id,
        activeTrip,
      )
    : Promise.resolve(null);
  const selectedDataPromise = viewAll
    ? allTripsDataPromise.then(
        (data) => data?.selectedTrip ?? loadSelectedData(),
      )
    : loadSelectedData();

  const [
    selectedData,
    allTripsData,
    unreadNotificationCount,
    recentActivity,
  ] = await Promise.all([
    selectedDataPromise,
    allTripsDataPromise,
    loadUnreadNotificationCount(
      session.user.id,
    ),
    listActivityForUser(
      session.user,
      6,
      viewAll ? "" : requestedTripId,
      viewAll ? [] : countryIds,
    ),
  ]);
  const { summary, budget } = selectedData;

  const me = summary.people.find(
    (person) =>
      person.userId ===
      session.user.id,
  );
  const individualMyShareSpent =
    me?.share ?? 0;
  const baseCurrency =
    allTripsData?.finance.baseCurrency ??
    selectedTrip?.baseCurrency ??
    "MYR";
  const myShareSpent =
    allTripsData?.finance.myShareSpent ??
    individualMyShareSpent;
  const displayMyBudget =
    allTripsData?.finance.myBudget ??
    budget.myBudget;
  const admin =
    isSystemAdmin(
      session.user.role,
    );
  const displayName =
    session.user.name.trim() ||
    "Traveler";
  const journeyGreeting =
    buildJourneyGreeting({
      displayName,
      viewAll,
      tripCount:
        tripOptions.length,
      selectedTrip,
      destinationNames:
        selectedCountries.map(
          (country) =>
            country.name,
        ),
      today:
        malaysiaDateString(),
    });
  const allTripStartDates =
    tripOptions
      .map((trip) => trip.startDate)
      .filter((value): value is string => Boolean(value))
      .sort();
  const allTripEndDates =
    tripOptions
      .map((trip) => trip.endDate)
      .filter((value): value is string => Boolean(value))
      .sort();
  const allTripDateLabel =
    formatTripDateRange(
      allTripStartDates[0],
      allTripEndDates.at(-1),
    );
  const heroDestination =
    viewAll
      ? "All trips"
      : selectedTrip?.name ??
        "Plan your next trip";
  const tripDateLabel =
    viewAll
      ? allTripDateLabel
      : selectedTrip
        ? formatTripDateRange(
            selectedTrip.startDate,
            selectedTrip.endDate,
          )
        : "Dates not set";
  const heroSecondary =
    viewAll
      ? `${tripOptions.length} trip${
          tripOptions.length === 1
            ? ""
            : "s"
        } ready`
      : selectedCountries.length
        ? `${selectedCountries.length} destination${
            selectedCountries.length ===
            1
              ? ""
              : "s"
          } ready`
        : "Create a trip or join a destination";
  const settlementLiveData =
    allTripsData?.settlement ??
    serializeSettlementLiveData(
      summary,
      baseCurrency,
    );

  const financeLiveData =
    allTripsData?.finance ?? {
      total: summary.total,
      categories:
        summary.categories,
      baseCurrency,
      myBudget:
        budget.myBudget,
      myShareSpent,
      myRemaining:
        budget.myBudget -
        myShareSpent,
      combinedBudget:
        budget.combinedBudget,
      groupRemaining:
        budget.combinedBudget -
        summary.total,
      budgetsSubmitted:
        budget.budgetsSubmitted,
      travelerCount:
        budget.travelerCount,
    };

  const commandCenter = selectedTrip
    ? await loadTripCommandCenter({
        tripId: selectedTrip.id,
        countryIds,
        userId: session.user.id,
        startDate: selectedTrip.startDate,
        endDate: selectedTrip.endDate,
        financialStatus: selectedTrip.financialStatus,
        myBudget: budget.myBudget,
        myShareSpent: individualMyShareSpent,
      })
    : null;

  const iOwe = settlementLiveData.waitingTransfers
    .filter((transfer) => transfer.fromUserId === session.user.id)
    .reduce((total, transfer) => total + transfer.amount, 0);
  const waitingForMe = settlementLiveData.pendingSettlements
    .filter((payment) => payment.toUserId === session.user.id)
    .reduce((total, payment) => total + payment.amount, 0);

  const endedTripIds = new Set(
    tripOptions
      .filter((trip) => tripEndedAtLeastOneDayAgo(trip.endDate))
      .map((trip) => trip.id),
  );
  const postTripSmartPlans = settlementLiveData.smartPlans.filter(
    (plan) =>
      endedTripIds.has(plan.tripId) &&
      plan.optimizedTransferCount > 0,
  );
  const smartTransferCount = postTripSmartPlans.reduce(
    (sum, plan) => sum + plan.optimizedTransferCount,
    0,
  );
  const smartTransfersSaved = postTripSmartPlans.reduce(
    (sum, plan) => sum + plan.transfersSaved,
    0,
  );
  const finishedOpenTrips = tripOptions.filter(
    (trip) =>
      tripEndedAtLeastOneDayAgo(trip.endDate) &&
      trip.financialStatus !== "CLOSED",
  );

  const actionItems = [
    finishedOpenTrips.length > 0
      ? {
          icon: "◎",
          title: `${finishedOpenTrips.length} completed trip${finishedOpenTrips.length === 1 ? " still accepts" : "s still accept"} expenses`,
          copy: "Lock the expense ledger once everyone has finished adding spending.",
          href: "/settlements",
        }
      : null,
    postTripSmartPlans.length > 0
      ? {
          icon: "✦",
          title: viewAll
            ? `Smart settlement ready · ${postTripSmartPlans.length} trip${postTripSmartPlans.length === 1 ? "" : "s"}`
            : `Trip complete · settle in ${smartTransferCount} transfer${smartTransferCount === 1 ? "" : "s"}`,
          copy:
            smartTransfersSaved > 0
              ? `Netting avoids ${smartTransfersSaved} unnecessary transfer${smartTransfersSaved === 1 ? "" : "s"}. Original records stay unchanged.`
              : "Your remaining balances are already optimized. Review the recommended payment plan.",
          href: "/settlements#smart-settlement-title",
        }
      : null,
    unreadNotificationCount > 0
      ? {
          icon: "🔔",
          title: `${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? "" : "s"}`,
          copy: "See what changed across your trips.",
          href: "/notifications",
        }
      : null,
    iOwe > 0
      ? {
          icon: "↗",
          title: `You have ${formatMoney(iOwe, baseCurrency)} to settle`,
          copy: "Review who is waiting for payment.",
          href: "/settlements",
        }
      : null,
    waitingForMe > 0
      ? {
          icon: "✓",
          title: `${formatMoney(waitingForMe, baseCurrency)} waiting for your confirmation`,
          copy: "Mark it received when the money arrives.",
          href: "/settlements",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  function activityTime(value: Date): string {
    return new Intl.DateTimeFormat("en-MY", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(value);
  }

  return (
    <div className="stack gap-lg dashboard-page">
      <section
        className={`dashboard-welcome journey-greeting journey-greeting--${journeyGreeting.tone}`}
      >
        <div className="dashboard-welcome-copy">
          <p className="journey-greeting-meta">
            <span className="journey-greeting-person">
              For {displayName}
            </span>
            <span
              className="journey-greeting-divider"
              aria-hidden="true"
            />
            <span>
              {journeyGreeting.context}
            </span>
          </p>
          <h1 className="dashboard-welcome-title">
            {journeyGreeting.title}
          </h1>
          <p className="journey-greeting-subtitle">
            {journeyGreeting.subtitle}
          </p>
        </div>

        {selectedTrip ? (
          selectedTrip.financialStatus === "CLOSED" ? (
            <Link
              className="button secondary dashboard-add"
              href="/settlements"
            >
              <span aria-hidden="true">✓</span>
              Final settlement
            </Link>
          ) : (
            <Link
              className="button primary dashboard-add"
              href="/expenses/new"
            >
              <span aria-hidden="true">
                ＋
              </span>
              Add expense
            </Link>
          )
        ) : (
          <Link
            className="button primary dashboard-add"
            href="/trips"
          >
            <span aria-hidden="true">
              ＋
            </span>
            Create trip
          </Link>
        )}
      </section>

      {!selectedTrip ? (
        <LivingJourneyStarter isAdmin={admin} />
      ) : null}

      {selectedTrip && commandCenter ? (
        <LivingJourneyHalo
          tripName={heroDestination}
          tripDateLabel={tripDateLabel}
          tripSummary={heroSecondary}
          tripOptions={tripOptions.map((trip) => ({ id: trip.id, name: trip.name }))}
          selectedTripId={requestedTripId}
          viewAll={viewAll}
          initialMode={commandCenter.stage === "DURING" ? "move" : commandCenter.stage === "BEFORE" ? "plan" : "spend"}
          stage={commandCenter.stage}
          nextTitle={commandCenter.nextItem?.title ?? "No upcoming plan"}
          nextMeta={commandCenter.nextItem
            ? `${formatTripDateRange(commandCenter.nextItem.itemDate, commandCenter.nextItem.itemDate)}${commandCenter.nextItem.itemTime ? ` · ${commandCenter.nextItem.itemTime}` : ""}`
            : "Add the next activity to keep everyone aligned."}
          destinationCount={selectedCountries.length}
          todayItemCount={commandCenter.todayItemCount}
          openTaskCount={commandCenter.openTaskCount}
          todayMyShare={commandCenter.todayMyShare}
          todayGroupSpend={commandCenter.todayGroupSpend}
          tripGroupSpend={financeLiveData.total}
          myShareSpent={myShareSpent}
          myBudget={displayMyBudget}
          dailyAllowance={commandCenter.dailyAllowance}
          projectedSpend={commandCenter.projectedSpend}
          myRemaining={financeLiveData.myRemaining}
          baseCurrency={baseCurrency}
          travelerCount={budget.travelerCount}
          unreadCount={unreadNotificationCount}
          iOwe={iOwe}
          waitingForMe={waitingForMe}
          closed={selectedTrip.financialStatus === "CLOSED"}
        />
      ) : null}

      {selectedTrip && actionItems.length > 0 ? (
        <section className="dashboard-action-centre" aria-labelledby="dashboard-action-title">
          <div className="travel-section-heading dashboard-action-heading">
            <div>
              <p className="eyebrow">NEEDS YOUR ATTENTION</p>
              <h2 id="dashboard-action-title">Quick things to do</h2>
            </div>
            <span>{actionItems.length} open</span>
          </div>

          <div className="dashboard-action-grid">
            {actionItems.map((item) => (
              <Link className="dashboard-action-card" href={item.href} key={`${item.href}-${item.title}`}>
                <span className="dashboard-action-icon" aria-hidden="true">{item.icon}</span>
                <span className="dashboard-action-copy">
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </span>
                <span className="dashboard-action-arrow" aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {selectedTrip ? (
        <>
          <LiveDashboardFinance
            initialData={
              financeLiveData
            }
            tripId={
              requestedTripId
            }
            allTrips={viewAll}
          />

          <LiveSettlementWorkspace
            initialData={
              settlementLiveData
            }
            currentUserId={
              session.user.id
            }
            tripId={
              requestedTripId
            }
            allTrips={viewAll}
            variant="dashboard"
          />

          {recentActivity.length > 0 ? (
            <section className="dashboard-recent-activity" aria-labelledby="recent-activity-title">
              <div className="travel-section-heading">
                <div>
                  <p className="eyebrow">RECENT ACTIVITY</p>
                  <h2 id="recent-activity-title">What changed</h2>
                </div>
                <Link className="dashboard-section-link" href="/activity">View all</Link>
              </div>

              <div className="dashboard-activity-list">
                {recentActivity.map((item) => (
                  <article className="dashboard-activity-row" key={item.id}>
                    <span className="dashboard-activity-dot" aria-hidden="true" />
                    <span className="dashboard-activity-copy">
                      <strong>{item.summary}</strong>
                      <small>{item.actorName ?? "System"} · {activityTime(item.createdAt)}</small>
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className="dashboard-travel-shortcuts"
            aria-labelledby="travel-shortcuts-title"
          >
            <div className="travel-section-heading">
              <div>
                <p className="eyebrow">
                  TRAVEL SHORTCUTS
                </p>
                <h2 id="travel-shortcuts-title">
                  Where next?
                </h2>
              </div>
              <span>
                Eat · Play · Sleep · Share
              </span>
            </div>

            <div className="quick-grid travel-quick-grid">
              <Link
                className="quick-action travel-quick plan"
                href="/planner"
              >
                <span className="quick-action-icon">
                  ⌁
                </span>
                <span>
                  <strong>
                    Explore the plan
                  </strong>
                  <small>
                    Itinerary, food &amp; places
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>

              <Link
                className="quick-action travel-quick map"
                href="/location"
              >
                <span className="quick-action-icon">
                  ⌖
                </span>
                <span>
                  <strong>
                    Find the crew
                  </strong>
                  <small>
                    See shared live locations
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>

              <Link
                className="quick-action travel-quick wallet"
                href="/expenses"
              >
                <span className="quick-action-icon">
                  ▤
                </span>
                <span>
                  <strong>
                    Trip wallet
                  </strong>
                  <small>
                    Receipts, spending &amp; shares
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>

              <Link
                className="quick-action travel-quick settle"
                href="/settlements"
              >
                <span className="quick-action-icon">
                  ✓
                </span>
                <span>
                  <strong>
                    Settle up
                  </strong>
                  <small>
                    Who paid and who is waiting
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
