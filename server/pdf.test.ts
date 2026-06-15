import { describe, expect, it } from "vitest";

import { generateQuoteHTML } from "./pdf";

describe("quote pdf html", () => {
  it("does not leak tv backdrop commentary into fireplace items with stale itemDetails", () => {
    const html = generateQuoteHTML(
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
          itemType: "fireplace",
          productId: 401,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          cabinetWidthMm: null,
          cabinetHeightMm: null,
          cabinetDepthMm: null,
          cabinetHeightFromFloorMm: null,
          quantityRequired: 1,
          unitPrice: 70000,
          totalPrice: 70000,
          manualPriceOverride: null,
          itemDetails: JSON.stringify({
            tvSizeInches: 86,
            backdropWidthMm: 2420,
            backdropHeightMm: 1220,
            tvBottomAfflMm: 700,
            cabinetToTvGapMm: 250,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any,
      new Map(),
      new Map([
        [
          401,
          {
            id: 401,
            productTypeId: 5,
            name: "Fire Place 2 60 inch",
            design: null,
            widthMm: null,
            heightMm: null,
            depthMm: null,
            pricePerUnit: 70000,
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
            wallName: "Living Room TV Wall",
            wallType: "custom",
            wallWidthMm: 3800,
            wallHeightMm: 2600,
            notes: null,
          },
        ],
      ]) as any
    );

    expect(html).toContain("Fire Place 2 60 inch");
    expect(html).not.toContain("TV install setout is recorded");
    expect(html).not.toContain("TV backdrop allowance");
    expect(html).not.toContain("2420mm x 1220mm backdrop");
  });
});
