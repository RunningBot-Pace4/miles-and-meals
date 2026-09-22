import ExcelJS from "exceljs";
import { unzipSync, zipSync, strToU8 } from "fflate";
import { itineraryKey, itineraryRowSchema, MAX_ITINERARY_BYTES, MAX_ITINERARY_ROWS, type ItineraryRow, type ItineraryPreviewRow } from "@/lib/itinerary-import";

const headers = ["Date", "Day (auto)", "Time / timing", "Area", "Place / activity", "Category (optional)", "Map URL (optional)", "Notes (optional)"];
const aliases: Record<string, keyof ItineraryRow> = {
  date: "itemDate", time: "itemTime", "time / timing": "itemTime", area: "area", place: "title", "place / activity": "title", activity: "title", title: "title",
  category: "subtype", "category (optional)": "subtype", "map url": "linkUrl", "map url (optional)": "linkUrl", url: "linkUrl", notes: "notes", "notes (optional)": "notes",
};
function text(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "object" && !(value instanceof Date)) {
    if ("formula" in value || "sharedFormula" in value) throw new Error("Use values rather than formulas in imported fields (Day is ignored).");
    if ("richText" in value) return value.richText.map(part => part.text).join("").trim();
    if ("hyperlink" in value) return String(value.hyperlink).trim();
    if ("error" in value) throw new Error("This cell contains an Excel error.");
  }
  return String(value).trim();
}
function excelDate(cell: ExcelJS.Cell, date1904: boolean) {
  if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
  if (typeof cell.value === "number") {
    if (!Number.isInteger(cell.value) || cell.value < 1 || cell.value > 2958465) throw new Error("Use a valid date without a time.");
    return new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + cell.value * 86400000).toISOString().slice(0, 10);
  }
  return text(cell);
}
function excelTime(cell: ExcelJS.Cell) {
  if (cell.value instanceof Date) return cell.value.toISOString().slice(11, 16);
  if (typeof cell.value === "number") {
    if (cell.value < 0 || cell.value >= 1) throw new Error("Use a time, range or timing description.");
    const minutes = Math.round(cell.value * 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  return text(cell);
}
export async function readItineraryWorkbook(bytes: Uint8Array, requestedSheet?: string) {
  if (bytes.byteLength > MAX_ITINERARY_BYTES) throw new Error("Choose an XLSX file up to 2 MB.");
  // Bound expanded size before ExcelJS parses XML. Never execute workbook formulas.
  let expanded = 0, entries = 0;
  const files = unzipSync(bytes, { filter: entry => {
    expanded += entry.originalSize; entries++;
    if (expanded > 20_000_000 || entry.originalSize > 8_000_000 || entries > 300) throw new Error("Workbook is too large. Use the itinerary template with up to 200 rows.");
    if (/vbaProject\.bin$/i.test(entry.name)) throw new Error("Macro workbooks are not supported.");
    return true;
  } });
  for (const [name, content] of Object.entries(files)) {
    if (/\.(xml|rels)$/i.test(name)) {
      let xml = new TextDecoder().decode(content);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported XML in workbook.");
      // Some valid XLSX producers prefix SpreadsheetML elements. ExcelJS expects
      // the same namespace as a default namespace. Preserve data and attributes.
      const namespace = /xmlns:([A-Za-z_][\w.-]*)="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/;
      const match = xml.match(namespace);
      if (match) {
        const prefix = match[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        xml = xml.replace(namespace, 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')
          .replace(new RegExp("(<\\/?)" + prefix + ":", "g"), "$1");
        files[name] = strToU8(xml);
      }
    }
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(zipSync(files)) as unknown as ExcelJS.Buffer, { ignoreNodes: ["tableParts", "drawing", "extLst"] });
  const candidates = workbook.worksheets.flatMap(sheet => {
    for (let row = 1; row <= Math.min(10, sheet.rowCount); row++) {
      const mapping = new Map<keyof ItineraryRow, number>();
      let repeated = false;
      sheet.getRow(row).eachCell((cell, column) => {
        const key = aliases[cell.text.trim().toLowerCase()];
        if (key) { if (mapping.has(key)) repeated = true; mapping.set(key, column); }
      });
      if (mapping.has("title") && mapping.has("itemDate")) return [{ sheet, row, mapping, repeated }];
    }
    return [];
  });
  const selected = requestedSheet ? candidates.find(item => item.sheet.name === requestedSheet) : candidates[0];
  if (!selected) throw new Error("Choose a sheet with Date and Place / activity columns in the first 10 rows.");
  if (selected.repeated) throw new Error("Repeated column headings. Keep only one column for each field.");
  if (selected.sheet.rowCount > 1010) throw new Error("Remove excess rows. Import up to 200 activities at a time.");
  const rows: ItineraryPreviewRow[] = [];
  const seen = new Set<string>();
  for (let index = selected.row + 1; index <= selected.sheet.rowCount; index++) {
    const draft: ItineraryRow = { title: "", itemDate: "", itemTime: "", area: "", subtype: "", linkUrl: "", notes: "" };
    const errors: string[] = [];
    for (const [key, column] of selected.mapping) {
      try {
        const cell = selected.sheet.getCell(index, column);
        draft[key] = key === "itemDate" ? excelDate(cell, !!workbook.properties.date1904) : key === "itemTime" ? excelTime(cell) : text(cell);
      } catch (error) { errors.push(`${key}: ${error instanceof Error ? error.message : "Invalid cell"}`); }
    }
    if (!errors.length && Object.values(draft).every(value => !value)) continue;
    const parsed = itineraryRowSchema.safeParse(draft);
    if (!parsed.success) errors.push(...parsed.error.issues.map(issue => `${String(issue.path[0])}: ${issue.message}`));
    const key = itineraryKey(draft), duplicate = seen.has(key);
    seen.add(key);
    rows.push({ ...draft, rowNumber: index, errors, duplicate });
    if (rows.length > MAX_ITINERARY_ROWS) throw new Error("Import up to 200 activities at a time.");
  }
  return { sheets: candidates.map(item => item.sheet.name), sheet: selected.sheet.name, rows };
}

export async function writeItineraryWorkbook(rows: ItineraryRow[], tripName: string, template = false) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Miles & Meals";
  const sheet = workbook.addWorksheet(template ? "Blank template" : "Itinerary", { views: [{ state: "frozen", ySplit: 5, showGridLines: false }] });
  sheet.getCell("A2").value = template ? "Miles & Meals itinerary template" : `${tripName} itinerary`;
  sheet.getCell("A2").font = { name: "Arial", size: 16, bold: true, color: { argb: "FF174B42" } };
  sheet.getCell("A3").value = "One activity per row. Flexible times are supported. Reimports add new rows; matching rows are skipped.";
  sheet.getRow(5).values = headers;
  sheet.columns = [16,13,30,34,58,22,34,46].map(width => ({ width }));
  const source = template ? Array.from({ length: 20 }, () => ({ title: "", itemDate: "", itemTime: "", area: "", subtype: "", linkUrl: "", notes: "" })) : rows;
  source.forEach((item, index) => {
    const row = index + 6;
    sheet.getRow(row).values = [item.itemDate ? new Date(`${item.itemDate}T00:00:00Z`) : null, { formula: `IF(A${row}="","",TEXT(A${row},"ddd"))`, result: item.itemDate ? new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(new Date(`${item.itemDate}T00:00:00Z`)) : "" }, item.itemTime, item.area, item.title, item.subtype, item.linkUrl, item.notes];
    sheet.getCell(row, 1).numFmt = "yyyy-mm-dd";
    sheet.getCell(row, 3).numFmt = "@";
    sheet.getRow(row).height = 44;
    sheet.getRow(row).eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: "Arial", size: 11, color: { argb: "FF253D3A" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? "FFFFFFFF" : "FFF0F7F5" } };
    });
    sheet.getCell(row, 6).dataValidation = { type: "list", allowBlank: true, formulae: ['"Plan,Place,Meals,Shop,Transport,Stay"'], showErrorMessage: false };
  });
  sheet.getRow(5).height = 32;
  sheet.getRow(5).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176F68" } };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  sheet.autoFilter = { from: "A5", to: `H${Math.max(6, source.length + 5)}` };
  return workbook.xlsx.writeBuffer();
}
