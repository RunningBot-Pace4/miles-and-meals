export type JourneyGreetingTone =
  | "empty"
  | "overview"
  | "planned"
  | "upcoming"
  | "active"
  | "complete";

export type JourneyGreetingTrip = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  financialStatus: string;
};

export type JourneyGreeting = {
  context: string;
  title: string;
  subtitle: string;
  tone: JourneyGreetingTone;
};

type JourneyGreetingInput = {
  displayName: string;
  viewAll: boolean;
  tripCount: number;
  selectedTrip: JourneyGreetingTrip | null;
  destinationNames?: string[];
  today: string;
};

function destinationLabel(
  trip: JourneyGreetingTrip,
  destinationNames: string[],
): string {
  const uniqueNames = [
    ...new Set(
      destinationNames
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];

  return uniqueNames.length === 1
    ? uniqueNames[0]!
    : trip.name.trim() || "Your trip";
}

function daysBetween(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);

  return Math.round(
    (toTime - fromTime) /
      (24 * 60 * 60 * 1000),
  );
}

export function buildJourneyGreeting({
  displayName,
  viewAll,
  tripCount,
  selectedTrip,
  destinationNames = [],
  today,
}: JourneyGreetingInput): JourneyGreeting {
  const name =
    displayName.trim() ||
    "Traveler";

  if (!selectedTrip) {
    return {
      context: "YOUR NEXT JOURNEY",
      title: "Put your next journey on the map.",
      subtitle: `${name}, start with one destination. We’ll keep the plan, spending and people together.`,
      tone: "empty",
    };
  }

  if (viewAll) {
    const tripWord =
      tripCount === 1
        ? "trip"
        : "trips";

    return {
      context: "YOUR JOURNEYS",
      title: "Everything ready when you are.",
      subtitle: `${name}, ${tripCount} ${tripWord} stay connected here—from the first plan to the final payment.`,
      tone: "overview",
    };
  }

  const destination =
    destinationLabel(
      selectedTrip,
      destinationNames,
    );
  const isComplete =
    selectedTrip.financialStatus ===
      "CLOSED" ||
    Boolean(
      selectedTrip.endDate &&
        selectedTrip.endDate <
          today,
    );

  if (isComplete) {
    return {
      context: "ONE FOR THE MEMORIES",
      title: "A journey worth remembering.",
      subtitle: `${destination} may be over, ${name}, but the details, payments and memories stay together here.`,
      tone: "complete",
    };
  }

  if (
    selectedTrip.startDate &&
    selectedTrip.startDate > today
  ) {
    const daysUntil = daysBetween(
      today,
      selectedTrip.startDate,
    );
    const timing =
      daysUntil === 1
        ? "your trip starts tomorrow."
        : `your trip starts in ${daysUntil} days.`;

    return {
      context: "THE COUNTDOWN IS ON",
      title: `${destination} is getting closer.`,
      subtitle: `${name}, ${timing} Your plan, spending and travel crew are ready here.`,
      tone: "upcoming",
    };
  }

  const isActive =
    Boolean(
      selectedTrip.startDate &&
        selectedTrip.startDate <=
          today,
    ) &&
    (!selectedTrip.endDate ||
      selectedTrip.endDate >=
        today);

  if (isActive) {
    return {
      context: "TODAY’S JOURNEY",
      title: `Make today count in ${destination}.`,
      subtitle: `${name}, your plan, spending and travel crew are together in one place.`,
      tone: "active",
    };
  }

  return {
    context: "YOUR TRIP, TAKING SHAPE",
    title: `${destination} starts here.`,
    subtitle: `${name}, shape the plan, set the budget and bring your travel crew together.`,
    tone: "planned",
  };
}
