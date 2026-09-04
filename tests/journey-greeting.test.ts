import { describe, expect, it } from "vitest";
import { buildJourneyGreeting } from "@/lib/journey-greeting";

const upcomingTrip = {
  name: "Vietnam working trip",
  startDate: "2026-09-14",
  endDate: "2026-09-20",
  financialStatus: "OPEN",
};

describe("contextual journey greeting", () => {
  it("invites a traveler with no trips to begin", () => {
    expect(
      buildJourneyGreeting({
        displayName: "JY",
        viewAll: false,
        tripCount: 0,
        selectedTrip: null,
        today: "2026-09-04",
      }),
    ).toEqual({
      context: "YOUR NEXT JOURNEY",
      title: "Put your next journey on the map.",
      subtitle:
        "JY, start with one destination. We’ll keep the plan, spending and people together.",
      tone: "empty",
    });
  });

  it("summarizes all trips without using a generic welcome", () => {
    const result = buildJourneyGreeting({
      displayName: "JY",
      viewAll: true,
      tripCount: 3,
      selectedTrip: upcomingTrip,
      today: "2026-09-04",
    });

    expect(result.tone).toBe("overview");
    expect(result.title).toBe("Everything ready when you are.");
    expect(result.subtitle).toContain("3 trips");
    expect(result.title).not.toContain("Welcome back");
  });

  it("shows a precise upcoming-trip countdown", () => {
    const result = buildJourneyGreeting({
      displayName: "JY",
      viewAll: false,
      tripCount: 1,
      selectedTrip: upcomingTrip,
      destinationNames: ["Vietnam"],
      today: "2026-09-04",
    });

    expect(result).toMatchObject({
      context: "THE COUNTDOWN IS ON",
      title: "Vietnam is getting closer.",
      tone: "upcoming",
    });
    expect(result.subtitle).toContain("starts in 10 days");
  });

  it("uses natural wording when the trip starts tomorrow", () => {
    const result = buildJourneyGreeting({
      displayName: "JY",
      viewAll: false,
      tripCount: 1,
      selectedTrip: {
        ...upcomingTrip,
        startDate: "2026-09-05",
      },
      destinationNames: ["Vietnam"],
      today: "2026-09-04",
    });

    expect(result.subtitle).toContain("your trip starts tomorrow");
  });

  it("recognizes a trip that is happening today", () => {
    const result = buildJourneyGreeting({
      displayName: "JY",
      viewAll: false,
      tripCount: 1,
      selectedTrip: {
        ...upcomingTrip,
        startDate: "2026-09-01",
      },
      destinationNames: ["Vietnam"],
      today: "2026-09-04",
    });

    expect(result).toMatchObject({
      context: "TODAY’S JOURNEY",
      title: "Make today count in Vietnam.",
      tone: "active",
    });
  });

  it("moves an ended trip into the memories state", () => {
    const result = buildJourneyGreeting({
      displayName: "JY",
      viewAll: false,
      tripCount: 1,
      selectedTrip: {
        ...upcomingTrip,
        startDate: "2026-08-10",
        endDate: "2026-08-14",
      },
      destinationNames: ["Vietnam"],
      today: "2026-09-04",
    });

    expect(result).toMatchObject({
      context: "ONE FOR THE MEMORIES",
      title: "A journey worth remembering.",
      tone: "complete",
    });
  });

  it("keeps an undated trip in a planning state", () => {
    const result = buildJourneyGreeting({
      displayName: "JY",
      viewAll: false,
      tripCount: 1,
      selectedTrip: {
        ...upcomingTrip,
        startDate: null,
        endDate: null,
      },
      destinationNames: ["Vietnam", "Thailand"],
      today: "2026-09-04",
    });

    expect(result).toMatchObject({
      context: "YOUR TRIP, TAKING SHAPE",
      title: "Vietnam working trip starts here.",
      tone: "planned",
    });
  });
});
