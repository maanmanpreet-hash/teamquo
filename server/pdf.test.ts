import { describe, expect, it } from "vitest";

import { generateQuoteHTML } from "./pdf";

function buildJob(totalEstimate: number) {
  return {
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
    totalEstimate,
    notes: null,
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-15"),
  } as any;
}

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

describe("quote pdf html", () => {
  it("renders a multi-wall customer quote as combined wall blocks with wall-level prices only", () => {
    const html = generateQuoteHTML(
      buildJob(999999),
      [
        {
          id: 1,
          jobId: 12,
          wallId: 101,
          itemType: "acoustic_panel",
          productId: 501,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          quantityRequired: 12,
          unitPrice: 21000,
          totalPrice: 252000,
          manualPriceOverride: null,
          itemDetails: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          jobId: 12,
          wallId: 101,
          itemType: "floating_cabinet",
          productId: 502,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          quantityRequired: 1,
          unitPrice: 99000,
          totalPrice: 99000,
          manualPriceOverride: null,
          itemDetails: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          jobId: 12,
          wallId: 101,
          itemType: "tv_backdrop",
          productId: 503,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          quantityRequired: 1,
          unitPrice: 43000,
          totalPrice: 43000,
          manualPriceOverride: null,
          itemDetails: JSON.stringify({ tvSizeInches: 86 }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 4,
          jobId: 12,
          wallId: 102,
          itemType: "marble_sheet",
          productId: 503,
          claddingVariantId: null,
          wallWidthMm: 3200,
          wallHeightMm: 2600,
          quantityRequired: 3,
          unitPrice: 18000,
          totalPrice: 54000,
          manualPriceOverride: null,
          itemDetails: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 5,
          jobId: 12,
          wallId: 102,
          itemType: "floating_cabinet",
          productId: 502,
          claddingVariantId: null,
          wallWidthMm: 3200,
          wallHeightMm: 2600,
          quantityRequired: 1,
          unitPrice: 91000,
          totalPrice: 91000,
          manualPriceOverride: null,
          itemDetails: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 6,
          jobId: 12,
          wallId: 102,
          itemType: "custom_item",
          productId: null,
          claddingVariantId: null,
          wallWidthMm: 3200,
          wallHeightMm: 2600,
          quantityRequired: 1,
          unitPrice: 0,
          totalPrice: 0,
          manualPriceOverride: null,
          itemDetails: JSON.stringify({ productType: "custom_item", customItemType: "TV bracket", customItemLabel: "TV bracket" }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any,
      new Map(),
      new Map([
        [501, { id: 501, name: "Sound Proof Acoustic Wall Panel Light Grey", design: null }],
        [502, { id: 502, name: "Floating TV Unit", design: null }],
        [503, { id: 503, name: "PVC Marble Sheet Excel 2", design: null }],
      ]) as any,
      undefined,
      undefined,
      new Map([
        [
          101,
          {
            id: 101,
            wallName: "Living Room TV Wall",
            wallType: "custom",
            wallWidthMm: 3800,
            wallHeightMm: 2600,
            notes: JSON.stringify({ obstructionStatus: "none", obstructionNotes: "", supplyInstallPrice: 205500 }),
          },
        ],
        [
          102,
          {
            id: 102,
            wallName: "Bedroom Feature Wall",
            wallType: "custom",
            wallWidthMm: 3200,
            wallHeightMm: 2600,
            notes: JSON.stringify({ obstructionStatus: "none", obstructionNotes: "", supplyInstallPrice: 145000 }),
          },
        ],
      ]) as any
    );

    expect(html).toContain("WALL 1 - LIVING ROOM TV WALL - 3.80m W x 2.60m H");
    expect(html).toContain("WALL 2 - BEDROOM FEATURE WALL - 3.20m W x 2.60m H");
    expect(html).toContain("<th>Items</th>");
    expect(html).toContain("<th>Price</th>");
    expect(countMatches(html, /Included products:/g)).toBe(2);
    expect(html).toContain("Acoustic Slat Panel - Sound Proof Acoustic Wall Panel Light Grey");
    expect(html).toContain("Floating TV Unit - Floating TV Unit");
    expect(html).toContain("TV Backdrop - PVC Marble Sheet Excel 2");
    expect(html).toContain("Marble Sheet - PVC Marble Sheet Excel 2");
    expect(html).toContain("Custom Item - TV bracket");
    expect(html).toContain('<div class="quote-items-price-value">$2055.00</div>');
    expect(html).toContain('<div class="quote-items-price-value">$1450.00</div>');
    expect(countMatches(html, /class="quote-items-row"/g)).toBe(2);
    expect(html).not.toContain("Supply &amp; Install");
    expect(countMatches(html, /Supply and Install Total/g)).toBe(1);
    expect(html).toContain("$3505.00");
    expect(countMatches(html, /\$3505\.00/g)).toBe(1);
    expect(html).not.toContain("No known obstructions recorded at quoting stage.");
    expect(html).not.toContain("Products included</th>");
    expect(html).not.toContain("Qty ");
    expect(html).not.toContain("Material");
    expect(html).not.toContain("Labour");
    expect(html).not.toContain("markup");
    expect(html).not.toContain("manualPriceOverride");
    expect(html).not.toContain("localhost");
    expect(html).not.toContain("print-preview");
    expect(html).not.toContain("test@example.com");
    expect(html).not.toContain("$2520.00");
    expect(html).not.toContain("$990.00");
  });

  it("keeps a single-wall quote on the same wall-level pricing model", () => {
    const html = generateQuoteHTML(
      buildJob(187500),
      [
        {
          id: 1,
          jobId: 12,
          wallId: 201,
          itemType: "fireplace",
          productId: 401,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
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
      undefined,
      undefined,
      new Map([
        [
          201,
          {
            id: 201,
            wallName: "Living Room TV Wall",
            wallType: "custom",
            wallWidthMm: 3800,
            wallHeightMm: 2600,
            notes: JSON.stringify({ obstructionStatus: "none", obstructionNotes: "", supplyInstallPrice: 187500 }),
          },
        ],
      ]) as any
    );

    expect(html).toContain("WALL 1 - LIVING ROOM TV WALL - 3.80m W x 2.60m H");
    expect(html).toContain("<th>Items</th>");
    expect(html).toContain("<th>Price</th>");
    expect(countMatches(html, /Included products:/g)).toBe(1);
    expect(html).toContain("Fire Place 2 60 inch");
    expect(html).toContain('<div class="quote-items-price-value">$1875.00</div>');
    expect(countMatches(html, /class="quote-items-row"/g)).toBe(1);
    expect(html).not.toContain("Supply &amp; Install");
    expect(countMatches(html, /Supply and Install Total/g)).toBe(1);
    expect(countMatches(html, /\$1875\.00/g)).toBe(2);
    expect(html).not.toContain("Products included</th>");
    expect(html).not.toContain("TV install setout is recorded");
    expect(html).not.toContain("TV backdrop allowance");
    expect(html).not.toContain("2420mm x 1220mm backdrop");
  });

  it("falls back to the old quote-level total only for a legacy single-wall quote", () => {
    const html = generateQuoteHTML(
      buildJob(205500),
      [
        {
          id: 1,
          jobId: 12,
          wallId: 301,
          itemType: "floating_cabinet",
          productId: 502,
          claddingVariantId: null,
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          quantityRequired: 1,
          unitPrice: 99000,
          totalPrice: 99000,
          manualPriceOverride: null,
          itemDetails: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any,
      new Map(),
      new Map([[502, { id: 502, name: "Floating TV Unit", design: null }]]) as any,
      undefined,
      undefined,
      new Map([
        [
          301,
          {
            id: 301,
            wallName: "Legacy Wall",
            wallType: "custom",
            wallWidthMm: 3800,
            wallHeightMm: 2600,
            notes: JSON.stringify({ obstructionStatus: "none", obstructionNotes: "" }),
          },
        ],
      ]) as any
    );

    expect(html).toContain('<div class="quote-items-price-value">$2055.00</div>');
    expect(countMatches(html, /\$2055\.00/g)).toBe(2);
  });

  it("omits placeholder customer email and only renders real obstruction notes", () => {
    const html = generateQuoteHTML(
      {
        ...buildJob(52500),
        clientEmail: "test@example.com",
      } as any,
      [
        {
          id: 1,
          jobId: 12,
          wallId: 401,
          itemType: "floating_cabinet",
          productId: 502,
          claddingVariantId: null,
          wallWidthMm: 2400,
          wallHeightMm: 2400,
          quantityRequired: 1,
          unitPrice: 52500,
          totalPrice: 52500,
          manualPriceOverride: null,
          itemDetails: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any,
      new Map(),
      new Map([[502, { id: 502, name: "Floating TV Unit", design: null }]]) as any,
      undefined,
      undefined,
      new Map([
        [
          401,
          {
            id: 401,
            wallName: "Entry Wall",
            wallType: "custom",
            wallWidthMm: 2400,
            wallHeightMm: 2400,
            notes: JSON.stringify({ obstructionStatus: "present", obstructionNotes: "Access via narrow stairwell.", supplyInstallPrice: 52500 }),
          },
        ],
      ]) as any
    );

    expect(html).not.toContain("test@example.com");
    expect(html).toContain("Access via narrow stairwell.");
    expect(html).not.toContain("No known obstructions recorded at quoting stage.");
    expect(html).not.toContain("localhost");
    expect(html).not.toContain("print-preview");
    expect(html).not.toContain("1/1");
  });
});
