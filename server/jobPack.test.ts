import { describe, expect, it } from "vitest";

import { generateJobPackHtml } from "./jobPack";

describe("job pack html", () => {
  it("renders wall drawings, product tables, and internal material totals", () => {
    const html = generateJobPackHtml(
      {
        id: 12,
        userId: 1,
        clientName: "Test Client",
        clientEmail: null,
        clientPhone: "0400000000",
        clientAddress: "1 Test Street",
        suburb: "Kalkallo",
        appointmentDate: null,
        appointmentTime: null,
        referenceImageUrl: null,
        operatorName: "Manpreet",
        status: "quoted",
        stage: "quoting",
        stageStatus: "in_progress",
        totalEstimate: 155000,
        notes: null,
        createdAt: new Date("2026-06-15"),
        updatedAt: new Date("2026-06-15"),
      } as any,
      [
        {
          id: 1,
          jobId: 12,
          wallId: 101,
          itemType: "tv_backdrop",
          productId: 301,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          cabinetWidthMm: null,
          cabinetHeightMm: null,
          cabinetDepthMm: null,
          cabinetHeightFromFloorMm: null,
          quantityRequired: 1,
          unitPrice: 0,
          totalPrice: 0,
          manualPriceOverride: null,
          itemDetails: JSON.stringify({ tvSizeInches: 75, includeTvBracket: true }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          jobId: 12,
          wallId: 101,
          itemType: "marble_sheet",
          productId: 302,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          cabinetWidthMm: null,
          cabinetHeightMm: null,
          cabinetDepthMm: null,
          cabinetHeightFromFloorMm: null,
          quantityRequired: 1,
          unitPrice: 8000,
          totalPrice: 8000,
          manualPriceOverride: null,
          itemDetails: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any,
      new Map([
        [
          301,
          {
            id: 301,
            productTypeId: 3,
            name: "PVC Marble Sheet Excel 4",
            design: "excel 4",
            widthMm: 1220,
            heightMm: 2900,
            depthMm: 3,
            pricePerUnit: 8000,
            description: null,
            isActive: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        [
          302,
          {
            id: 302,
            productTypeId: 3,
            name: "PVC Marble Sheet Excel 7",
            design: "excel 7",
            widthMm: 1220,
            heightMm: 2900,
            depthMm: 3,
            pricePerUnit: 8000,
            description: null,
            isActive: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      ]) as any,
      new Map([
        [
          101,
          {
            id: 101,
            jobId: 12,
            wallType: "custom",
            wallName: "Living Room TV Wall",
            wallWidthMm: 3800,
            wallHeightMm: 2600,
            notes: null,
          },
        ],
      ]) as any
    );

    expect(html).toContain("Installer Job Pack");
    expect(html).toContain("Living Room TV Wall");
    expect(html).toContain("3800mm");
    expect(html).toContain("2600mm");
    expect(html).toContain("Selected Products");
    expect(html).toContain("Internal Material Lines");
    expect(html).toContain("Consolidated Internal Material Totals");
    expect(html).toContain("Reference Material Cost");
    expect(html).toContain("PVC Marble Sheet 1220x3x2900mm");
    expect(html).toContain("6mm MDF Sheet 1220x2440mm");
  });
});
