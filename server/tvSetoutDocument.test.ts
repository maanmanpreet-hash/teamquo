import { describe, expect, it } from "vitest";

import { calculateTvBackdropSetout } from "../shared/tvSetout";
import { generateTvBackdropSetoutHtml } from "../shared/tvSetoutDocument";

describe("generateTvBackdropSetoutHtml", () => {
  it("renders a single-page installer setout with the mark from floor block", () => {
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
    expect(html).toContain("MARK FROM FLOOR");
    expect(html).toContain("Cabinet bottom");
    expect(html).toContain("0 mm");
    expect(html).toContain("TV bottom");
    expect(html).toContain("700 mm");
    expect(html).toContain("Backdrop");
    expect(html).not.toContain("Widths");
    expect(html).not.toContain("Positioning");
  });
});
