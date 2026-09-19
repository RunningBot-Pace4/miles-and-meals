import { expect, it } from "vitest";
import { plannerTab, plannerTabUrl, plannerTabs } from "@/lib/planner-tab";
import { parseGoogleSavedPlaces } from "@/lib/google-saved-places";
import { comparePlaceDistances, coordinates, distanceKm, placeCoordinates, sortFromStay } from "@/lib/place-distance";

it("preserves every planner tab in a validated trip-switch destination", () => {
  for (const tab of plannerTabs) expect(plannerTab(new URL(plannerTabUrl(tab), "https://app.test").searchParams.get("tab")!)).toBe(tab);
  expect(plannerTab("BAD")).toBe("ITINERARY");
  expect(plannerTab()).toBe("ITINERARY");
});
it("splits one CSV into all three categories with coordinates retained", () => {
  const csv = "Title,URL,Category,Latitude,Longitude\nTemple,https://maps.google.com/?cid=1,Place,22.28,114.15\nCafe,https://maps.google.com/?cid=2,Meals,,\nOutlet,https://maps.google.com/?cid=3,Shop,,";
  const result = parseGoogleSavedPlaces(csv);
  expect(result.places.map((p) => p.itemType)).toEqual(["PLACE", "FOOD", "SHOPPING"]);
  expect(placeCoordinates(result.places[0].linkUrl, result.places[0].notes)).toEqual({ latitude: 22.28, longitude: 114.15 });
});
it("defaults a blank category and reports invalid categories or coordinates", () => {
  const result = parseGoogleSavedPlaces("Title,URL,Category,Latitude,Longitude\nGood,https://maps.google.com/?cid=1,,,\nBad,https://maps.google.com/?cid=2,Unknown,,\nBadPoint,https://maps.google.com/?cid=3,Shop,999,114");
  expect(result.places).toHaveLength(1);
  expect(result.places[0].itemType).toBe("PLACE");
  expect(result.warnings).toHaveLength(2);
});
it("sorts near to far from accommodation with unknowns last and stable ties", () => {
  const rows = [
    { title: "unknown", linkUrl: "https://maps.google.com/?cid=1", notes: "" },
    { title: "far", linkUrl: "https://maps.google.com/?q=0,2", notes: "" },
    { title: "near", linkUrl: "https://maps.google.com/?q=0,1", notes: "" },
    { title: "near2", linkUrl: "https://maps.google.com/?q=0,1", notes: "" },
  ];
  expect(sortFromStay(rows, { latitude: 0, longitude: 0 }).map((r) => r.title)).toEqual(["near", "near2", "far", "unknown"]);
  expect(rows[0].title).toBe("unknown");
  expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2);
});
it("never treats a map camera center or place identifier as a location", () => {
  expect(placeCoordinates("https://www.google.com/maps/place/name/@22.3,114.2,12z/data=!1s0x123:0x456")).toBeNull();
  expect(placeCoordinates("https://www.google.com/maps/place/name/data=!3d22.3!4d114.2")).toEqual({ latitude: 22.3, longitude: 114.2 });
  expect(coordinates("91,180")).toBeNull();
  expect(coordinates("0,0")).toEqual({ latitude: 0, longitude: 0 });
  expect(coordinates("Hotel Hong Kong")).toBeNull();
});

it("supports both distance directions with unknowns last and zero km valid", () => {
  const rows = [undefined, 5, 0, 2];
  expect([...rows].sort((a, b) => comparePlaceDistances(a, b, "nearest"))).toEqual([0, 2, 5, undefined]);
  expect([...rows].sort((a, b) => comparePlaceDistances(a, b, "farthest"))).toEqual([5, 2, 0, undefined]);
  expect(comparePlaceDistances(undefined, 5, "farthest")).toBe(1);
  expect(comparePlaceDistances(5, undefined, "nearest")).toBe(-1);
  expect(comparePlaceDistances(5, 2, "plan")).toBe(0);
});
