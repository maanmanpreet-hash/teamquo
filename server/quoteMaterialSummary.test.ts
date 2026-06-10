import { describe, expect, it } from "vitest";

import { buildQuoteFormMaterialSummary, mapQuoteWallsForMaterialSummary } from "../client/src/lib/quoteMaterialSummary";

describe("quote material summary mapper", () => {
  it("maps quote form wall data into material intelligence input", () => {
    const mapped = mapQuoteWallsForMaterialSummary([
      {
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
            unitPrice: 5909,
          },
        ],
      },
    ]);

    expect(mapped).toEqual([
      {
        wallName: "TV Wall",
        wallWidthMm: 3800,
        wallHeightMm: 2600,
        products: [
          {
            productType: "tv_backdrop",
            productName: "TV Backdrop",
            quantity: 1,
            unitCostCents: undefined,
            acousticFixingMethod: undefined,
            tvSizeInches: 75,
          },
          {
            productType: "marble_sheet",
            productName: "PVC Marble Sheet",
            quantity: 1,
            unitCostCents: 5909,
            acousticFixingMethod: undefined,
            tvSizeInches: undefined,
          },
        ],
      },
    ]);
  });

  it("builds a material summary from quote form walls", () => {
    const summary = buildQuoteFormMaterialSummary([
      {
        wallName: "TV Wall",
        wallWidthMm: 3800,
        wallHeightMm: 2600,
        products: [
          { productType: "tv_backdrop", productName: "TV Backdrop", quantity: 1, tvSizeInches: 75 },
          { productType: "marble_sheet", productName: "PVC Marble Sheet", quantity: 1, unitPrice: 5909 },
          { productType: "tv_backdrop", productName: "Supply & Install TV Bracket", quantity: 1 },
        ],
      },
    ]);

    expect(summary.consolidatedLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "pvc-marble-sheet", quantity: 2 }),
        expect.objectContaining({ key: "mdf-backing-6mm", quantity: 2 }),
        expect.objectContaining({ key: "high-tack-glue", quantity: 2 }),
        expect.objectContaining({ key: "tv-bracket", quantity: 1 }),
      ])
    );
  });

  it("falls back safely for unsupported product and fixing values", () => {
    const mapped = mapQuoteWallsForMaterialSummary([
      {
        wallName: "Unknown Wall",
        wallWidthMm: 1200,
        wallHeightMm: 2400,
        products: [
          {
            productType: "unsupported",
            productName: "Unknown Product",
            quantity: 1,
            acousticFixingMethod: "unsupported",
          },
        ],
      },
    ]);

    expect(mapped[0].products[0]).toEqual(
      expect.objectContaining({
        productType: "cladding",
        acousticFixingMethod: undefined,
      })
    );
  });
});
