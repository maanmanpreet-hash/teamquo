import { describe, expect, it, vi } from "vitest";

import {
  applyItemDetailsToProduct,
  buildItemDetails,
  getResumeJobIdFromLocation,
} from "../client/src/pages/QuoteForm";

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
      productId: "701",
      productName: "TV Backdrop - Custom",
      quantity: 1,
      unitPrice: 0,
      tvSizeInches: 75,
      includeTvBracket: true,
    });

    const restoredTv = applyItemDetailsToProduct(
      {
        id: "tv-1",
        productType: "tv_backdrop",
        productId: "701",
        productName: "TV Backdrop - Custom",
        quantity: 1,
        unitPrice: 0,
      },
      tvItemDetails
    );

    expect(restoredTv.tvSizeInches).toBe(75);
    expect(restoredTv.includeTvBracket).toBe(true);

    const joineryItemDetails = buildItemDetails({
      id: "cabinet-1",
      productType: "floating_cabinet",
      productId: "601",
      productName: "Floating Cabinet - Custom",
      quantity: 1,
      unitPrice: 120000,
      cabinetWidthMm: 1800,
      cabinetHeightMm: 420,
      cabinetDepthMm: 350,
      cabinetHeightFromFloorMm: 180,
    });

    const restoredJoinery = applyItemDetailsToProduct(
      {
        id: "cabinet-1",
        productType: "floating_cabinet",
        productId: "601",
        productName: "Floating Cabinet - Custom",
        quantity: 1,
        unitPrice: 120000,
      },
      joineryItemDetails
    );

    expect(restoredJoinery.cabinetWidthMm).toBe(1800);
    expect(restoredJoinery.cabinetHeightMm).toBe(420);
    expect(restoredJoinery.cabinetDepthMm).toBe(350);
    expect(restoredJoinery.cabinetHeightFromFloorMm).toBe(180);
  });
});
