import { describe, expect, it, vi } from "vitest";

import {
  applyItemDetailsToProduct,
  buildItemDetails,
} from "../client/src/lib/quote/itemDetails";
import {
  getWallAssociatedCost,
  hasManualWallSupplyInstallPrice,
} from "../client/src/lib/quote/wallNotes";
import {
  getResumeJobIdFromLocation,
} from "../client/src/lib/quote/resumeQuote";
import {
  resolveCatalogProductTypeId,
  usesCatalogProductSelection,
} from "../client/src/lib/quote/productTypeHelpers";

describe("quote form persistence helpers", () => {
  it("reads resume job id from query string and path", () => {
    vi.stubGlobal("window", {
      location: {
        search: "",
      },
    });

    expect(getResumeJobIdFromLocation("/quote?resumeJobId=42")).toBe(42);
    expect(getResumeJobIdFromLocation("/quote/84")).toBe(84);
    expect(getResumeJobIdFromLocation("/quote?resumeJobId=not-a-number")).toBeNull();
    expect(getResumeJobIdFromLocation("/dashboard")).toBeNull();
  });

  it("falls back to window search when the routed location string omits query params", () => {
    vi.stubGlobal("window", {
      location: {
        search: "?resumeJobId=128",
      },
    });

    expect(getResumeJobIdFromLocation("/quote")).toBe(128);
  });

  it("maps TV backdrop to the marble sheet masterlist when loading product options", () => {
    expect(
      resolveCatalogProductTypeId("tv_backdrop", [
        { id: 3, slug: "marble-sheet" },
        { id: 7, slug: "tv-backdrop" },
      ])
    ).toBe(3);
  });

  it("treats custom joinery items as no-catalog products", () => {
    expect(usesCatalogProductSelection("floating_cabinet")).toBe(false);
    expect(usesCatalogProductSelection("side_tower")).toBe(false);
    expect(usesCatalogProductSelection("shelving")).toBe(false);
    expect(usesCatalogProductSelection("tv_backdrop")).toBe(true);
  });

  it("round-trips acoustic fixing details through itemDetails", () => {
    const itemDetails = buildItemDetails({
      id: "acoustic-1",
      productType: "acoustic_panel",
      productId: "201",
      productName: "Acoustic Slat Panel",
      quantity: 7,
      unitPrice: 7500,
      acousticFixingMethod: "screws_and_glue",
    });

    const restored = applyItemDetailsToProduct(
      {
        id: "acoustic-1",
        productType: "acoustic_panel",
        productId: "201",
        productName: "Acoustic Slat Panel",
        quantity: 7,
        unitPrice: 7500,
      },
      itemDetails
    );

    expect(restored.acousticFixingMethod).toBe("screws_and_glue");
    expect(restored.itemDetails).toBe(itemDetails);
  });

  it("round-trips TV backdrop and custom joinery details through itemDetails", () => {
    const tvItemDetails = buildItemDetails({
      id: "tv-1",
      productType: "tv_backdrop",
      productId: "301",
      productName: "PVC Marble Sheet Excel 4",
      quantity: 1,
      unitPrice: 0,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1400,
      tvBottomAfflMm: 760,
      cabinetHeightFromFloorMm: 180,
      cabinetHeightMm: 420,
      cabinetTopAfflMm: 450,
      cabinetToTvGapMm: 310,
      includeTvBracket: true,
    });

    const restoredTv = applyItemDetailsToProduct(
      {
        id: "tv-1",
        productType: "tv_backdrop",
        productId: "301",
        productName: "PVC Marble Sheet Excel 4",
        quantity: 1,
        unitPrice: 0,
      },
      tvItemDetails
    );

    expect(restoredTv.tvSizeInches).toBe(75);
    expect(restoredTv.backdropWidthMm).toBe(2200);
    expect(restoredTv.backdropHeightMm).toBe(1400);
    expect(restoredTv.tvBottomAfflMm).toBe(760);
    expect(restoredTv.cabinetHeightFromFloorMm).toBe(180);
    expect(restoredTv.cabinetHeightMm).toBe(420);
    expect(restoredTv.cabinetTopAfflMm).toBe(450);
    expect(restoredTv.cabinetToTvGapMm).toBe(310);
    expect(restoredTv.includeTvBracket).toBe(true);

    const joineryItemDetails = buildItemDetails({
      id: "cabinet-1",
      productType: "floating_cabinet",
      productId: "",
      productName: "Floating Cabinet - Custom",
      quantity: 1,
      unitPrice: 0,
      cabinetWidthMm: 1800,
      cabinetHeightMm: 420,
      cabinetDepthMm: 350,
      cabinetHeightFromFloorMm: 180,
      cabinetSectionWidthsMm: [600, 600, 600],
      cabinetShelfHeightsBySectionMm: [[210], [], [210, 320]],
      clientPreferenceNotes: "Matte beige finish with push-to-open profile",
    });

    const restoredJoinery = applyItemDetailsToProduct(
      {
        id: "cabinet-1",
        productType: "floating_cabinet",
        productId: "",
        productName: "Floating Cabinet - Custom",
        quantity: 1,
        unitPrice: 0,
      },
      joineryItemDetails
    );

    expect(restoredJoinery.cabinetWidthMm).toBe(1800);
    expect(restoredJoinery.cabinetHeightMm).toBe(420);
    expect(restoredJoinery.cabinetDepthMm).toBe(350);
    expect(restoredJoinery.cabinetHeightFromFloorMm).toBe(180);
    expect(restoredJoinery.cabinetSectionWidthsMm).toEqual([600, 600, 600]);
    expect(restoredJoinery.cabinetShelfHeightsBySectionMm).toEqual([[210], [210, 320]]);
    expect(restoredJoinery.clientPreferenceNotes).toBe("Matte beige finish with push-to-open profile");
  });

  it("round-trips custom item details through itemDetails", () => {
    const itemDetails = buildItemDetails({
      id: "custom-1",
      productType: "custom_item",
      productId: "",
      productName: "LEDs",
      quantity: 1,
      unitPrice: 0,
      customItemType: "LEDs",
    });

    const restored = applyItemDetailsToProduct(
      {
        id: "custom-1",
        productType: "custom_item",
        productId: "",
        productName: "Custom Item",
        quantity: 1,
        unitPrice: 0,
      },
      itemDetails
    );

    expect(restored.customItemType).toBe("LEDs");
    expect(restored.productName).toBe("LEDs");
    expect(restored.itemDetails).toBe(itemDetails);
  });

  it("keeps associated cost separate from manual wall pricing", () => {
    expect(
      getWallAssociatedCost({
        products: [
          { quantity: 2, unitPrice: 12500 },
          { quantity: 1, unitPrice: 45000 },
        ],
      } as any)
    ).toBe(70000);

    expect(hasManualWallSupplyInstallPrice({ supplyInstallPrice: 0 } as any)).toBe(false);
    expect(hasManualWallSupplyInstallPrice({ supplyInstallPrice: 205500 } as any)).toBe(true);
  });
});
