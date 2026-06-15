import { describe, expect, it } from "vitest";
import {
  buildInternalMaterialListText,
  buildQuoteMaterialSummary,
  calculateTvBackdropDimensions,
  calculateTvDimensions,
  consolidateMaterialLines,
  estimateWallMaterials,
} from "../shared/materialIntelligence";

describe("material intelligence", () => {
  it("calculates PVC marble sheet and one glue per sheet for full wall PVC", () => {
    const estimate = estimateWallMaterials({
      wallName: "Living Room TV Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "marble_sheet",
          productName: "PVC Marble Sheet",
          quantity: 1,
        },
      ],
    });

    expect(estimate.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "pvc-marble-sheet", quantity: 4 }),
        expect.objectContaining({ key: "high-tack-glue", quantity: 4 }),
      ])
    );
  });

  it("reflects selected cladding variants in the internal material summary", () => {
    const estimate = estimateWallMaterials({
      wallName: "Feature Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "cladding",
          productName: "PVC Internal Wall Cladding Excel 01",
          quantity: 23,
          unitCostCents: 1500,
        },
      ],
    });

    expect(estimate.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "PVC Internal Wall Cladding Excel 01",
          quantity: 23,
          unitCostCents: 1500,
        }),
      ])
    );
  });

  it("converts TV size to 16:9 dimensions and adds 100mm backdrop extension each side", () => {
    expect(calculateTvDimensions(75)).toEqual({
      diagonalInches: 75,
      widthMm: 1660,
      heightMm: 934,
    });

    expect(calculateTvBackdropDimensions(75)).toEqual({
      diagonalInches: 75,
      widthMm: 1660,
      heightMm: 934,
      backdropWidthMm: 1860,
      backdropHeightMm: 1134,
    });
  });

  it("calculates TV Backdrop PVC and MDF from backdrop size, not full wall size", () => {
    const estimate = estimateWallMaterials({
      wallName: "TV Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "tv_backdrop",
          productName: "TV Backdrop",
          quantity: 1,
          tvSizeInches: 75,
        },
        {
          productType: "marble_sheet",
          productName: "PVC Marble Sheet",
          quantity: 1,
        },
      ],
    });

    expect(estimate.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "pvc-marble-sheet", quantity: 2 }),
        expect.objectContaining({ key: "high-tack-glue", quantity: 2 }),
        expect.objectContaining({ key: "mdf-backing-6mm", quantity: 2 }),
      ])
    );
  });

  it("does not add MDF for PVC alone", () => {
    const estimate = estimateWallMaterials({
      wallName: "Plain PVC Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "marble_sheet",
          productName: "PVC Marble Sheet",
          quantity: 1,
        },
      ],
    });

    expect(estimate.lines.some(line => line.key === "mdf-backing-6mm")).toBe(false);
  });

  it("keeps acoustic fixings operator selected and applies locked consumption rules", () => {
    const noFixings = estimateWallMaterials({
      wallName: "Acoustic Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "acoustic_panel",
          productName: "Acoustic Slat Panel",
          quantity: 7,
          acousticFixingMethod: "none",
        },
      ],
    });

    const screwsAndGlue = estimateWallMaterials({
      wallName: "Acoustic Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "acoustic_panel",
          productName: "Acoustic Slat Panel",
          quantity: 7,
          acousticFixingMethod: "screws_and_glue",
        },
      ],
    });

    expect(noFixings.lines.some(line => line.key === "acoustic-glue")).toBe(false);
    expect(noFixings.lines.some(line => line.key === "black-screws")).toBe(false);
    expect(screwsAndGlue.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "acoustic-glue", quantity: 4 }),
        expect.objectContaining({ key: "black-screws", quantity: 63 }),
      ])
    );
  });

  it("adds TV bracket at $50 when selected", () => {
    const estimate = estimateWallMaterials({
      wallName: "TV Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "tv_backdrop",
          productName: "TV Backdrop",
          quantity: 1,
          tvSizeInches: 75,
        },
        {
          productType: "tv_backdrop",
          productName: "Supply & Install TV Bracket",
          quantity: 1,
        },
      ],
    });

    expect(estimate.lines).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "tv-bracket", quantity: 1, unitCostCents: 5000 })])
    );
  });

  it("reflects mirrors and fireplaces without applying wastage rules", () => {
    const estimate = estimateWallMaterials({
      wallName: "Media Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "mirror",
          productName: "LED Full Moon Mirror Round 1200mm",
          quantity: 1,
          unitCostCents: 35000,
        },
        {
          productType: "fireplace",
          productName: "Fire Place 2 60 inch",
          quantity: 1,
          unitCostCents: 70000,
        },
      ],
    });

    expect(estimate.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "LED Full Moon Mirror Round 1200mm",
          quantity: 1,
          unitCostCents: 35000,
        }),
        expect.objectContaining({
          name: "Fire Place 2 60 inch",
          quantity: 1,
          unitCostCents: 70000,
        }),
      ])
    );
    expect(estimate.lines.some(line => line.key === "high-tack-glue")).toBe(false);
  });

  it("excludes custom cabinetry from automatic material costing", () => {
    const estimate = estimateWallMaterials({
      wallName: "Cabinet Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "floating_cabinet",
          productName: "Floating Cabinet - Custom",
          quantity: 1,
        },
        {
          productType: "side_tower",
          productName: "Left Tower",
          quantity: 1,
        },
      ],
    });

    expect(estimate.lines).toHaveLength(0);
    expect(estimate.notes.join(" ")).toContain("custom joinery");
  });

  it("records a review note when TV Backdrop is selected without TV size", () => {
    const estimate = estimateWallMaterials({
      wallName: "TV Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [{ productType: "tv_backdrop", productName: "TV Backdrop", quantity: 1 }],
    });

    expect(estimate.lines).toHaveLength(0);
    expect(estimate.notes.join(" ")).toContain("TV size is missing");
  });

  it("consolidates material lines across multiple walls", () => {
    const wallEstimates = [
      estimateWallMaterials({
        wallName: "TV Wall",
        wallWidthMm: 3800,
        wallHeightMm: 2600,
        products: [
          { productType: "tv_backdrop", productName: "TV Backdrop", quantity: 1, tvSizeInches: 75 },
          { productType: "marble_sheet", productName: "PVC Marble Sheet", quantity: 1 },
        ],
      }),
      estimateWallMaterials({
        wallName: "Bedroom Wall",
        wallWidthMm: 3600,
        wallHeightMm: 2600,
        products: [
          { productType: "acoustic_panel", productName: "Acoustic Slat Panel", quantity: 6, acousticFixingMethod: "glue" },
        ],
      }),
    ];

    const totals = consolidateMaterialLines(wallEstimates);

    expect(totals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "pvc-marble-sheet", quantity: 2, referenceCostCents: 11818 }),
        expect.objectContaining({ key: "mdf-backing-6mm", quantity: 2, referenceCostCents: 6800 }),
        expect.objectContaining({ key: "high-tack-glue", quantity: 2, referenceCostCents: 1456 }),
        expect.objectContaining({ key: "acoustic-glue", quantity: 3, referenceCostCents: 2184 }),
      ])
    );
  });

  it("builds a quote material summary with wall breakdown, consolidated totals, cost and notes", () => {
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
      {
        wallName: "Cabinet Wall",
        wallWidthMm: 3800,
        wallHeightMm: 2600,
        products: [
          { productType: "floating_cabinet", productName: "Floating Cabinet - Custom", quantity: 1 },
        ],
      },
    ]);

    expect(summary.walls).toHaveLength(2);
    expect(summary.consolidatedLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "pvc-marble-sheet", quantity: 2 }),
        expect.objectContaining({ key: "mdf-backing-6mm", quantity: 2 }),
        expect.objectContaining({ key: "high-tack-glue", quantity: 2 }),
        expect.objectContaining({ key: "tv-bracket", quantity: 1, referenceCostCents: 5000 }),
      ])
    );
    expect(summary.referenceCostCents).toBe(25074);
    expect(summary.notes.join(" ")).toContain("custom joinery");
  });

  it("exports an internal material list text with and without reference costs", () => {
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

    const withCosts = buildInternalMaterialListText(summary, {
      quoteNumber: "Q-2026-0001",
      clientName: "Test Client",
      clientAddress: "1 Test Street",
    });

    expect(withCosts).toContain("INTERNAL MATERIAL LIST");
    expect(withCosts).toContain("Quote: Q-2026-0001");
    expect(withCosts).toContain("Customer: Test Client");
    expect(withCosts).toContain("Address: 1 Test Street");
    expect(withCosts).toContain("PVC Marble Sheet 1220x3x2900mm x 2 | $118.18");
    expect(withCosts).toContain("6mm MDF Sheet 1220x2440mm x 2 | $68.00");
    expect(withCosts).toContain("TV Bracket x 1 | $50.00");
    expect(withCosts).toContain("Reference Material Cost: $250.74");

    const withoutCosts = buildInternalMaterialListText(summary, { includeReferenceCosts: false });
    expect(withoutCosts).toContain("TV Bracket x 1");
    expect(withoutCosts).not.toContain("Reference Material Cost");
    expect(withoutCosts).not.toContain("$50.00");
  });
});
