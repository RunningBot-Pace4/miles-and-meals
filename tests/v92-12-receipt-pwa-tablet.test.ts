import {
  readFileSync,
} from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const read = (path: string) =>
  readFileSync(path, "utf8");

describe("V92.12 receipt and responsive PWA system", () => {
  it("isolates receipt paper before running the OCR passes", () => {
    const ocr = read(
      "src/lib/receipt-ocr-client.ts",
    );
    const crop = read(
      "src/lib/receipt-crop.ts",
    );

    expect(ocr).toContain(
      "detectReceiptCrop(decoded)",
    );
    expect(ocr).toContain(
      'status: "Finding receipt edges"',
    );
    expect(ocr).toContain(
      "const maxSide = 3600",
    );
    expect(crop).toContain(
      "findReceiptBounds",
    );
    expect(crop).toContain(
      "connected area",
    );
  });

  it("uses a two-column command centre on real tablet widths", () => {
    const css = read(
      "src/app/v92-living-journey.css",
    );
    const rules = css.slice(
      css.indexOf(
        "/* V92.12 · phone rhythm",
      ),
    );

    expect(rules).toContain(
      "@media (min-width: 641px) and (max-width: 1023px)",
    );
    expect(rules).toContain(
      "minmax(240px, 0.78fr)",
    );
    expect(rules).toContain(
      "grid-template-columns: minmax(0, 1fr) auto !important",
    );
  });

  it("keeps phone dashboard headings on one balanced row", () => {
    const css = read(
      "src/app/v92-living-journey.css",
    );
    const rules = css.slice(
      css.indexOf(
        "/* V92.12 · phone rhythm",
      ),
    );

    expect(rules).toContain(
      ".dashboard-recent-activity .travel-section-heading",
    );
    expect(rules).toContain(
      ".dashboard-travel-shortcuts .travel-section-heading",
    );
    expect(rules).toContain(
      "grid-template-columns: minmax(0, 1fr) auto !important",
    );
  });

  it("extends the authenticated route audit through tablet and desktop", () => {
    const audit = read(
      "e2e/v92-9-full-pwa-audit.spec.ts",
    );
    const geometry = read(
      "e2e/v92-12-pwa-layout.spec.ts",
    );

    for (const width of [
      320,
      390,
      430,
      600,
      768,
      820,
      1024,
      1280,
    ]) {
      expect(audit).toContain(String(width));
    }

    expect(audit).toContain('"/more"');
    expect(audit).toContain('"/admin/health"');
    expect(audit).toContain(
      'a[href^="/expenses/"][href$="/edit"]',
    );
    expect(geometry).toContain(
      "activitySameRow",
    );
    expect(geometry).toContain(
      "panelIsRight",
    );
  });
});
