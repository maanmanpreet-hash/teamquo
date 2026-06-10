import { describe, expect, it } from "vitest";
import { estimateWallMaterials } from "../shared/materialIntelligence";

describe("material intelligence", () => {
  it("calculates PVC marble sheet and one glue per sheet", () => {
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

  it("adds MDF only when TV Backdrop is selected", () => {
    const withoutBackdrop = estimateWallMaterials({
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

    const withBackdrop = estimateWallMaterials({
      wallName: "TV Wall",
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      products: [
        {
          productType: "tv_backdrop",
          productName: "TV Backdrop",
          quantity: 1,
        },
        {
          productType: "marble_sheet",
          productName: "PVC Marble Sheet",
          quantity: 1,
        },
      ],
    });

    expect(withoutBackdrop.lines.some(line => line.key === "mdf-backing-6mm")).toBe(false);
    expect(withBackdrop.lines).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "mdf-backing-6mm", quantity: 4 })])
    );
  });

  it("keeps acoustic fixings operator selected", () => {
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
    expect(noFixings.lines.some(line => line.key === "black-screws-pack")).toBe(false);
    expect(screwsAndGlue.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "acoustic-glue", quantity: 7 }),
        expect.objectContaining({ key: "black-screws-pack", quantity: 1 }),
      ])
    );
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
});
