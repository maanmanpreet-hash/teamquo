import { describe, expect, it } from "vitest";

import { buildElevationDocuments } from "../shared/elevationJobDocuments";

describe("buildElevationDocuments", () => {
  it("builds TV installer and cabinet production documents from saved wall products", () => {
    const documents = buildElevationDocuments(
      {
        id: 9001,
        clientName: "Example Test Client",
        createdAt: new Date("2026-06-16T00:00:00Z"),
      },
      [
        {
          id: 8001,
          wallName: "Living Room TV Wall",
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          products: [
            {
              id: 7002,
              itemType: "floating_cabinet",
              cabinetWidthMm: 2100,
              cabinetHeightMm: 450,
              cabinetDepthMm: 360,
              cabinetHeightFromFloorMm: 0,
              itemDetails: JSON.stringify({
                widthMm: 2100,
                heightMm: 450,
                depthMm: 360,
                heightFromFloorMm: 0,
                sectionWidthsMm: [700, 700, 700],
                shelfHeightsBySectionMm: [[230], [], [230]],
              }),
            },
            {
              id: 7003,
              itemType: "tv_backdrop",
              itemDetails: JSON.stringify({
                productType: "tv_backdrop",
                tvSizeInches: 86,
                backdropWidthMm: 2420,
                backdropHeightMm: 1220,
                tvBottomAfflMm: 700,
                cabinetTopAfflMm: 450,
                cabinetToTvGapMm: 250,
              }),
            },
          ],
        },
      ],
      "16/06/2026"
    );

    expect(documents).toHaveLength(2);
    expect(documents[0].selectorLabel).toContain("TV Installer Setout");
    expect(documents[0].document.pages).toHaveLength(2);
    expect(documents[0].document.pages[0].markList).toBeUndefined();
    expect(documents[0].document.pages[0].horizontalDimensions).toEqual([]);
    expect(documents[0].document.pages[0].infoRows).toBeUndefined();
    expect(documents[0].document.pages[0].objects.some(object => object.id === "cabinet-divider-0")).toBe(false);
    expect(documents[0].document.pages[1].objects.some(object => object.id === "cabinet-divider-0")).toBe(true);
    expect(documents[0].document.pages[1].objects.some(object => object.id === "cabinet-divider-1")).toBe(true);
    expect(documents[0].document.pages[1].title).toContain("Front Elevation");
    expect(documents[1].selectorLabel).toContain("Floating Cabinet");
    expect(documents[1].document.pages).toHaveLength(2);
  });

  it("skips malformed wall entries without breaking other setout documents", () => {
    const documents = buildElevationDocuments(
      {
        id: 9002,
        clientName: "Example Test Client",
      },
      [
        {
          id: 8002,
          wallName: "Broken Joinery Wall",
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          products: [
            {
              id: 7004,
              itemType: "floating_cabinet",
              cabinetWidthMm: 2100,
              cabinetHeightMm: 450,
              cabinetDepthMm: 0,
              itemDetails: JSON.stringify({
                widthMm: 2100,
                heightMm: 450,
                depthMm: 0,
              }),
            },
          ],
        },
        {
          id: 8003,
          wallName: "Living Room TV Wall",
          wallWidthMm: 3600,
          wallHeightMm: 2600,
          products: [
            {
              id: 7005,
              itemType: "tv_backdrop",
              itemDetails: JSON.stringify({
                tvSizeInches: 86,
                backdropWidthMm: 2420,
                backdropHeightMm: 1220,
                cabinetBottomAfflMm: 0,
                cabinetHeightMm: 450,
                cabinetToTvGapMm: 250,
              }),
            },
          ],
        },
      ],
      "16/06/2026"
    );

    expect(documents).toHaveLength(1);
    expect(documents[0].selectorLabel).toContain("TV Installer Setout");
  });
});
