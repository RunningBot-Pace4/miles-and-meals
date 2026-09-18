import { describe, expect, it } from "vitest";
import { googleMapsPlaceKey, newSavedPlaces, parseGoogleSavedPlaces } from "@/lib/google-saved-places";

const map = (name: string, id: number) => `https://www.google.com/maps/place/${name}/data=!4m2!3m1!1s0x123:0x${id.toString(16)}`;

describe("Google Saved places CSV", () => {
  it("reads the Takeout preamble and empty record without making them places", () => {
    const result = parseGoogleSavedPlaces(`\uFEFFTravel\r\n\r\nTitle,Note,URL,Tags,Comment\r\n,,,,\r\nMan Mo Temple,,${map("temple", 1)},,\r\n昂坪360纜車站,,${map("cable-car", 2)},,`);
    expect(result.places.map((place) => place.title)).toEqual(["Man Mo Temple", "昂坪360纜車站"]);
    expect(result.warnings).toEqual([]);
  });
  it("preserves quoted commas, doubled quotes, multiline notes, tags and comments", () => {
    const result = parseGoogleSavedPlaces(`Title,Note,URL,Tags,Comment\n"Cafe, \"\"Blue\"\"","First floor\nAsk for tea",${map("cafe", 1)},Cafe,Go early`);
    expect(result.places[0]).toEqual({ title: 'Cafe, "Blue"', linkUrl: map("cafe", 1), notes: "First floor\nAsk for tea\n\nTags: Cafe\n\nComment: Go early" });
  });
  it("matches the same place across renamed links and cid without merging different branches", () => {
    expect(googleMapsPlaceKey(map("old-name", 42))).toBe(googleMapsPlaceKey("https://maps.google.com/?cid=42"));
    const places = [
      { title: "Cafe", linkUrl: map("cafe", 1), notes: "" },
      { title: "Cafe", linkUrl: map("another-branch", 2), notes: "" },
    ];
    expect(newSavedPlaces(places, [map("renamed", 1)])).toEqual([places[1]]);
  });
  it("deduplicates repeated file entries and ignores tracking parameters", () => {
    const result = parseGoogleSavedPlaces(`Title,Note,URL,Tags,Comment\nCafe,,${map("cafe", 1)},,\nRenamed cafe,,${map("renamed", 1)}?entry=tts,,`);
    expect(result.places).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
    expect(googleMapsPlaceKey("https://maps.app.goo.gl/abc?utm_source=share&g_st=app")).toBe(googleMapsPlaceKey("https://maps.app.goo.gl/abc"));
  });
  it("skips unsafe links and malformed records with visible warnings", () => {
    const result = parseGoogleSavedPlaces(`Title,Note,URL,Tags,Comment\nBad,,javascript:alert(1),,\nSpoof,,https://google.com.evil.test/maps/foo,,\nGood,,${map("good", 3)},,\nToo many,,${map("more", 4)},,,extra`);
    expect(result.places).toHaveLength(1);
    expect(result.warnings).toHaveLength(3);
    expect(googleMapsPlaceKey("https://user:password@www.google.com/maps/place/foo")).toBeNull();
    expect(googleMapsPlaceKey("https://www.google.com:444/maps/place/foo")).toBeNull();
  });
  it("rejects malformed quotes, missing headers, empty files and excessive rows", () => {
    expect(() => parseGoogleSavedPlaces('Title,URL\n"Unclosed')).toThrow(/unfinished/);
    expect(() => parseGoogleSavedPlaces('Title,URL\n"Name"extra,url')).toThrow(/outside/);
    expect(() => parseGoogleSavedPlaces("Wrong,Header")).toThrow(/Title and URL/);
    expect(() => parseGoogleSavedPlaces("Title,URL\n,")).toThrow(/No valid/);
    expect(() => parseGoogleSavedPlaces("Title,URL\n" + Array.from({ length: 251 }, (_, index) => `Place,${map("place", index)}`).join("\n"))).toThrow(/250/);
    expect(() => parseGoogleSavedPlaces("x".repeat(1_000_001))).toThrow(/1 MB/);
  });
  it("does not silently truncate notes beyond the editor's limit", () => {
    const result = parseGoogleSavedPlaces(`Title,Note,URL\nLong,${"x".repeat(1001)},${map("long", 1)}\nOkay,,${map("okay", 2)}`);
    expect(result.places[0].title).toBe("Okay");
    expect(result.warnings).toHaveLength(1);
  });
});
