import { describe, expect, it } from "vitest";

import {
  formatPositiveNumberList,
  formatShelfHeightsBySection,
  isCompatibleItemDetails,
  normaliseCabinetBreakdown,
  parsePositiveNumberList,
  parseShelfHeightsBySection,
  parseItemDetails,
} from "../client/src/lib/quote/itemDetails";
import { shouldResetQuoteFormForResumeChange } from "../client/src/lib/quote/resumeQuote";
import { getBackdropDimensionsFromCatalogProduct, calculateTvBackdrop } from "../client/src/lib/quote/tvBackdropForm";
import { decodeWallNotes, encodeWallNotes } from "../client/src/lib/quote/wallNotes";

describe("quote form helper modules", () => {
  it("encodes and decodes wall notes without losing supply/install metadata", () => {
    const encoded = encodeWallNotes({
      obstructionStatus: "present",
      obstructionNotes: "Power point to confirm",
      supplyInstallPrice: 245000,
    });

    expect(decodeWallNotes(encoded)).toEqual({
      obstructionStatus: "present",
      obstructionNotes: "Power point to confirm",
      supplyInstallPrice: 245000,
    });
  });

  it("decides when resume quote state should reset", () => {
    expect(shouldResetQuoteFormForResumeChange(null, 42)).toBe(false);
    expect(shouldResetQuoteFormForResumeChange(42, 42)).toBe(false);
    expect(shouldResetQuoteFormForResumeChange(42, 84)).toBe(true);
    expect(shouldResetQuoteFormForResumeChange(42, null)).toBe(true);
  });

  it("parses and formats positive number lists", () => {
    expect(parsePositiveNumberList("600, 0, 450, nope, -3, 900")).toEqual([600, 450, 900]);
    expect(formatPositiveNumberList([600, 450, 900])).toBe("600, 450, 900");
    expect(formatPositiveNumberList(undefined)).toBe("");
  });

  it("parses and formats shelf heights by section", () => {
    expect(parseShelfHeightsBySection("210, 320 | 0 | 180, nope |")).toEqual([[210, 320], [180]]);
    expect(formatShelfHeightsBySection([[210, 320], [180]])).toBe("210, 320 | 180");
    expect(formatShelfHeightsBySection(undefined)).toBe("");
  });

  it("normalises cabinet breakdown values", () => {
    expect(normaliseCabinetBreakdown([0, 600, -50, 900], [[0, 200], [], [320, -5]])).toEqual({
      sectionWidthsMm: [600, 900],
      shelfHeightsBySectionMm: [[200], [320]],
    });
    expect(normaliseCabinetBreakdown(undefined, undefined)).toEqual({
      sectionWidthsMm: undefined,
      shelfHeightsBySectionMm: undefined,
    });
  });

  it("parses itemDetails safely and checks product compatibility", () => {
    expect(parseItemDetails("{bad json")).toEqual({});
    expect(
      isCompatibleItemDetails("tv_backdrop", {
        tvSizeInches: 75,
        backdropWidthMm: 2200,
      })
    ).toBe(true);
    expect(
      isCompatibleItemDetails("custom_item", {
        customItemLabel: "LEDs",
      })
    ).toBe(true);
    expect(
      isCompatibleItemDetails("floating_cabinet", {
        randomField: 123,
      })
    ).toBe(false);
  });

  it("derives backdrop dimensions from the selected catalog product", () => {
    expect(getBackdropDimensionsFromCatalogProduct({ widthMm: 1220, heightMm: 2900 })).toEqual({
      backdropWidthMm: 2900,
      backdropHeightMm: 1220,
    });
    expect(getBackdropDimensionsFromCatalogProduct({ widthMm: null, heightMm: 2900 })).toBeUndefined();
  });

  it("calculates tv backdrop helper dimensions consistently", () => {
    expect(calculateTvBackdrop(75)).toMatchObject({
      tvSizeInches: 75,
      minimumOverhangEachSideMm: 100,
      pvcGlueTubes: expect.any(Number),
      pvcSheets: expect.any(Number),
      mdfSheets: expect.any(Number),
    });
    const calculated = calculateTvBackdrop(75);
    expect(calculated.backdropWidthMm).toBe(calculated.tvWidthMm + 200);
    expect(calculated.backdropHeightMm).toBe(calculated.tvHeightMm + 200);
  });
});
