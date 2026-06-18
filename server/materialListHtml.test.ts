import { describe, expect, it } from "vitest";

import { buildQuoteMaterialSummary } from "../shared/materialIntelligence";
import { generateInternalMaterialListHtml } from "../shared/materialListHtml";

describe("internal material list html", () => {
  it("renders a locked shopping list with one flat material table and no pricing", () => {
    const summary = buildQuoteMaterialSummary([
      {
        wallName: "TV Wall",
        wallWidthMm: 3800,
        wallHeightMm: 2600,
        products: [
          { productType: "tv_backdrop", productName: "TV Backdrop", quantity: 1, tvSizeInches: 75 },
          { productType: "marble_sheet", productName: "PVC Marble Sheet", quantity: 1 },
          { productType: "tv_backdrop", productName: "Supply & Install TV Bracket", quantity: 1 },
        ],
      },
    ]);

    const html = generateInternalMaterialListHtml({
      quoteNumber: "Q-2026-0001",
      clientName: "Test Client",
      clientAddress: "1 Test Street",
      generatedDateText: "11/06/2026",
      summary,
    });

    expect(html).toContain("Material List");
    expect(html).toContain("Quote: Q-2026-0001");
    expect(html).toContain("Customer: Test Client");
    expect(html).toContain("Address: 1 Test Street");
    expect(html).toContain("Date: 11/06/2026");
    expect(html).toContain("PVC Marble Sheet 1220x3x2900mm");
    expect(html).toContain("6mm MDF Sheet 1220x2440mm");
    expect(html).toContain("TV Bracket");
    expect(html).not.toContain("TV Wall");
    expect(html).not.toContain("Consolidated Totals");
    expect(html).not.toContain("Reference Material Cost");
    expect(html).not.toContain("Unit Cost");
    expect(html).not.toContain("Reference Cost");
    expect(html).not.toContain("Internal shopping list only.");
    expect(html).not.toContain("$");
  });

  it("escapes customer supplied header fields", () => {
    const summary = buildQuoteMaterialSummary([]);
    const html = generateInternalMaterialListHtml({
      quoteNumber: "<script>",
      clientName: "Client & Co",
      clientAddress: "1 <Test> Street",
      summary,
    });

    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Client &amp; Co");
    expect(html).toContain("1 &lt;Test&gt; Street");
    expect(html).not.toContain("<script>");
  });
});
