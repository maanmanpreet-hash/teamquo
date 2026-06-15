import { describe, expect, it } from "vitest";

import { calculateTvBackdropSetout } from "../shared/tvSetout";

describe("calculateTvBackdropSetout", () => {
  it("matches the known sample case", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1220,
      cabinetBottomAfflMm: 0,
      cabinetHeightMm: 450,
      cabinetToTvGapMm: 250,
    });

    expect(result.cabinetBottomAfflMm).toBe(0);
    expect(result.cabinetHeightMm).toBe(450);
    expect(result.cabinetTopAfflMm).toBe(450);
    expect(result.tvBottomAfflMm).toBe(700);
    expect(result.tvTopAfflMm).toBe(1771);
    expect(result.backdropBottomAfflMm).toBeCloseTo(625.5, 1);
    expect(result.backdropTopAfflMm).toBeCloseTo(1845.5, 1);
    expect(result.tvBottomDerivedFromCabinetGap).toBe(true);
    expect(result.tvBottomSource).toBe("cabinet_bottom_and_height");
    expect(result.actualCabinetToTvGapMm).toBe(250);
  });

  it("uses cabinet top plus gap when bottom-plus-height inputs are incomplete", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3000,
      wallHeightMm: 2400,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1400,
      cabinetTopAfflMm: 450,
      cabinetToTvGapMm: 310,
      tvBottomAfflMm: 760,
    });

    expect(result.tvBottomAfflMm).toBe(760);
    expect(result.tvBottomDerivedFromCabinetGap).toBe(true);
    expect(result.tvBottomSource).toBe("cabinet_top");
    expect(result.actualCabinetToTvGapMm).toBe(310);
  });

  it("falls back to manual TV bottom AFFL only when cabinet-driven paths are unavailable", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3000,
      wallHeightMm: 2400,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1400,
      cabinetBottomAfflMm: 180,
      cabinetHeightMm: 420,
      tvBottomAfflMm: 760,
    });

    expect(result.tvBottomAfflMm).toBe(760);
    expect(result.tvBottomDerivedFromCabinetGap).toBe(false);
    expect(result.tvBottomSource).toBe("manual");
    expect(result.cabinetTopAfflMm).toBe(600);
  });

  it("prefers cabinet bottom plus height plus gap over manual TV bottom", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1220,
      cabinetBottomAfflMm: 120,
      cabinetHeightMm: 430,
      cabinetToTvGapMm: 220,
      tvBottomAfflMm: 999,
    });

    expect(result.cabinetTopAfflMm).toBe(550);
    expect(result.tvBottomAfflMm).toBe(770);
    expect(result.tvBottomSource).toBe("cabinet_bottom_and_height");
  });

  it("raises the expected warnings only when triggered", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 2400,
      wallHeightMm: 1800,
      tvSizeInches: 98,
      backdropWidthMm: 2000,
      backdropHeightMm: 1000,
      tvBottomAfflMm: 900,
      cabinetTopAfflMm: 400,
    });

    expect(result.warnings.map(warning => warning.code)).toEqual(
      expect.arrayContaining([
        "tv_wider_than_backdrop",
        "tv_exceeds_wall",
        "tv_may_appear_high",
        "top_margin_tight",
        "cabinet_gap_large",
      ])
    );
  });
});
