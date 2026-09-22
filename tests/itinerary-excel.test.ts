import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { zipSync, strToU8 } from "fflate";
import { readFileSync } from "node:fs";
import { readItineraryWorkbook, writeItineraryWorkbook } from "../src/lib/itinerary-excel";
import { itineraryDuration, newItineraryRows, type ItineraryRow } from "../src/lib/itinerary-import";
import { suggestedDayOrder } from "../src/lib/smart-route";
const row: ItineraryRow = { title: "Man Mo Temple 文武庙", itemDate: "2026-09-25", itemTime: "14:25-15:05", area: "Sheung Wan", subtype: "Place", linkUrl: "", notes: "Keep my original notes" };
async function custom(rows: unknown[][], second = false) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Trip");
  rows.forEach(values => sheet.addRow(values));
  if (second) wb.addWorksheet("Other").addRows([["Date", "Place"], ["2026-09-26", "Another day"]]);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
describe("Excel itinerary round trip", () => {
  it("preserves dates, Unicode, flexible timing, categories, notes and input order", async () => {
    const rows = [row, { ...row, title: "Hotel", itemTime: "After check-in" }, { ...row, title: "Ferry", itemTime: "Around 19:15" }];
    const result = await readItineraryWorkbook(new Uint8Array(await writeItineraryWorkbook(rows, "Hong Kong")));
    expect(result.rows.map(({ rowNumber, errors, duplicate, ...item }) => item)).toEqual(rows);
    expect(result.rows.every(item => !item.errors.length && !item.duplicate)).toBe(true);
    expect(itineraryDuration(row.itemTime)).toBe(40);
    expect(itineraryDuration("Around 19:15")).toBeNull();
  });
  it("exports an empty reusable template whose Day formulas are ignored", async () => {
    const result = await readItineraryWorkbook(new Uint8Array(await writeItineraryWorkbook([], "Trip", true)));
    expect(result.rows).toEqual([]);
  });
  it("accepts the previously delivered 45-row Hong Kong workbook", async () => {
    const result = await readItineraryWorkbook(readFileSync("tests/fixtures/itinerary-template.xlsx"));
    expect(result.rows).toHaveLength(45);
    expect(result.rows.filter(item => item.errors.length)).toEqual([]);
    expect(result.rows[0]).toMatchObject({ itemDate: "2026-09-24", itemTime: "After check-in" });
    expect(result.rows[44]).toMatchObject({ itemDate: "2026-09-28", title: "Flight Home", itemTime: "11:00" });
    expect(result.sheets).toEqual(["Hong Kong plan", "Blank template"]);
  });
  it("accepts the user's original Date/Day/Time/Area/Place headings and sheet choice", async () => {
    const bytes = await custom([["Date", "Day", "Time", "Area", "Place"], ["2026-09-24", "ignored", "15:30-17:15 (if time allows)", "Wan Chai", "Bakehouse"]], true);
    expect((await readItineraryWorkbook(bytes)).rows[0]).toMatchObject({ itemTime: "15:30-17:15 (if time allows)", title: "Bakehouse", errors: [] });
    expect((await readItineraryWorkbook(bytes, "Other")).rows[0].title).toBe("Another day");
  });
  it("accepts native Excel dates/times and leaves undated activities unscheduled", async () => {
    const result = await readItineraryWorkbook(await custom([["Date", "Time", "Place"], [new Date("2026-09-25T00:00:00Z"), 0.5, "Lunch"], [null, "After lunch", "Walk"]]));
    expect(result.rows[0]).toMatchObject({ itemDate: "2026-09-25", itemTime: "12:00" });
    expect(result.rows[1]).toMatchObject({ itemDate: "", itemTime: "After lunch", errors: [] });
  });
  it("flags invalid dates, missing titles, unsafe links and formulas without dropping rows silently", async () => {
    const result = await readItineraryWorkbook(await custom([["Date", "Place", "URL"], ["2026-02-30", "Bad date", ""], ["2026-09-25", "", "javascript:alert(1)"], ["2026-09-25", { formula: '"Hidden"', result: "Hidden" }, ""]]));
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every(item => item.errors.length)).toBe(true);
  });
  it("skips exact matches but allows revisiting a place on another date", () => {
    expect(newItineraryRows([row, row, { ...row, itemDate: "2026-09-26" }], [row])).toEqual([{ ...row, itemDate: "2026-09-26" }]);
  });
  it("rejects duplicate headers, excessive rows and oversized expanded ZIP files", async () => {
    await expect(readItineraryWorkbook(await custom([["Date", "Place", "Title"], ["2026-09-24", "one", "two"]]))).rejects.toThrow("Repeated");
    await expect(readItineraryWorkbook(await custom([["Date", "Place"], ...Array.from({length:201}, () => ["2026-09-24", "Place"])]))).rejects.toThrow("200");
    await expect(readItineraryWorkbook(zipSync({ "xl/worksheets/sheet1.xml": strToU8(" ".repeat(8_000_001)) }))).rejects.toThrow("too large");
  });
  it("exports user text beginning with equals as text, not a formula", async () => {
    const title = '=HYPERLINK("https://example.invalid","name")';
    const result = await readItineraryWorkbook(new Uint8Array(await writeItineraryWorkbook([{ ...row, title }], "Trip")));
    expect(result.rows[0]).toMatchObject({ title, errors: [] });
  });
  it("uses the starting time of a range when ordering a day", () => {
    const base = { itemDate: "2026-09-25", area: "Central", durationMinutes: 40, sortOrder: 0 };
    const ordered = suggestedDayOrder([
      { ...base, id: "later", title: "Later", itemTime: "16:00-17:00" },
      { ...base, id: "earlier", title: "Earlier", itemTime: "09:30-10:15" },
    ]);
    expect(ordered.map(item => item.id)).toEqual(["earlier", "later"]);
  });
});
