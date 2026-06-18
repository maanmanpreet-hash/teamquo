import { describe, expect, it } from "vitest";

import { calculateTvBackdropSetout } from "../shared/tvSetout";
import { generateTvBackdropSetoutHtml } from "../shared/tvSetoutDocument";

describe("generateTvBackdropSetoutHtml", () => {
  it("renders a single-page installer setout without summary or repeated tables", () => {
    const html = generateTvBackdropSetoutHtml({
      quoteNumber: "Q-2026-0001",
      clientName: "Sample Client",
      wallName: "Living Room TV Wall",
      setout: calculateTvBackdropSetout({
        wallWidthMm: 3600,
        wallHeightMm: 2600,
        tvSizeInches: 86,
        backdropWidthMm: 2420,
        backdropHeightMm: 1220,
        cabinetBottomAfflMm: 0,
        cabinetHeightMm: 450,
        cabinetToTvGapMm: 250,
      }),
    });

    expect(html).toContain("@page { size: A4 landscape; margin: 0; }");
    expect(html).toContain("INSTALL HEIGHTS");
    expect(html).toContain("Cabinet bottom");
    expect(html).toContain("0 mm");
    expect(html).toContain("TV bottom AFFL");
    expect(html).toContain("700 mm");
    expect(html).toContain("Backdrop");
    expect(html).not.toContain("SETOUT SUMMARY");
    expect(html).not.toContain("MARK FROM FLOOR");
    expect(html).not.toContain("WIDTH CHECKS");
    expect(html).not.toContain("Mark these AFFL levels from floor before fixing backdrop or cabinet elements.");
  });
});
