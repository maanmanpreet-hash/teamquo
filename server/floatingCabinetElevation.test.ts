import { describe, expect, it } from "vitest";

import { createFloatingCabinetElevationDocument } from "../shared/elevationPresets";
import { renderElevationDocumentHtml } from "../shared/elevationRenderer";

describe("floating cabinet elevation preset", () => {
  it("renders a single overall production page without internal 16 mm breakdown details", () => {
    const document = createFloatingCabinetElevationDocument({
      quoteNumber: "Q-2026-0002",
      clientName: "Sample Client",
      itemName: "Floating Cabinet",
      widthMm: 2100,
      heightMm: 450,
      depthMm: 360,
      heightFromFloorMm: 180,
      sections: [
        { widthMm: 700, shelfHeightsMm: [230] },
        { widthMm: 700 },
        { widthMm: 700, shelfHeightsMm: [230] },
      ],
    });

    const html = renderElevationDocumentHtml(document);

    expect(document.pages).toHaveLength(1);
    expect(document.pages[0].title).toContain("Front");
    expect(html).toContain("Production elevation");
    expect(html).toContain("Overall width");
    expect(html).not.toContain("Opening 1 width");
    expect(html).not.toContain("16 mm");
    expect(html).toContain("2100 mm");
    expect(html).toContain("450 mm");
    expect(html).toContain("360 mm");
  });
});
