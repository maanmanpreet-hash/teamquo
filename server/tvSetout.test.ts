import { describe, expect, it } from "vitest";

import {
  DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM,
  DEFAULT_TV_VISUAL_CENTRE_AFFL_MM,
  MIN_BACKDROP_TO_CABINET_GAP_MM,
  buildTvBackdropInstallerSummary,
  calculateTvBackdropSetout,
} from "../shared/tvSetout";

describe("calculateTvBackdropSetout", () => {
  it("uses the 1100 mm visual-centre fallback and default_visual_centre source for TV-only setouts", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3200,
      wallHeightMm: 2600,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1400,
    });

    expect(result.tvBottomSource).toBe("default_visual_centre");
    expect(result.tvCentreAfflMm).toBe(DEFAULT_TV_VISUAL_CENTRE_AFFL_MM);
  });

  it("resolves an 85 inch fallback setout from the default visual centre", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 85,
      backdropWidthMm: 2400,
      backdropHeightMm: 1400,
    });

    expect(result.tvHeightMm).toBeGreaterThanOrEqual(1058);
    expect(result.tvHeightMm).toBeLessThanOrEqual(1059);
    expect(result.tvBottomAfflMm).toBe(571);
    expect(result.tvTopAfflMm).toBeGreaterThanOrEqual(1629);
    expect(result.tvTopAfflMm).toBeLessThanOrEqual(1630);
    expect(result.tvBottomSource).toBe("default_visual_centre");
  });

  it("defaults cabinet bottom to 150 and cabinet gap to 250 when cabinet height exists", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1220,
      cabinetHeightMm: 450,
    });

    expect(result.cabinetBottomAfflMm).toBe(DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM);
    expect(result.cabinetTopAfflMm).toBe(600);
    expect(result.cabinetToTvGapMm).toBe(250);
    expect(result.tvBottomAfflMm).toBe(850);
    expect(result.tvBottomSource).toBe("cabinet_bottom_and_height");
  });

  it("moves the TV bottom by the cabinet-height difference when other cabinet inputs stay fixed", () => {
    const shorterCabinet = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1220,
      cabinetBottomAfflMm: 120,
      cabinetHeightMm: 430,
      cabinetToTvGapMm: 220,
    });
    const tallerCabinet = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1220,
      cabinetBottomAfflMm: 120,
      cabinetHeightMm: 510,
      cabinetToTvGapMm: 220,
    });

    expect(tallerCabinet.tvBottomAfflMm - shorterCabinet.tvBottomAfflMm).toBe(80);
  });

  it("uses manual TV bottom when cabinet placement is incomplete", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3000,
      wallHeightMm: 2400,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1400,
      cabinetBottomAfflMm: 180,
      tvBottomAfflMm: 760,
    });

    expect(result.tvBottomAfflMm).toBe(760);
    expect(result.tvBottomSource).toBe("manual");
    expect(result.cabinetTopAfflMm).toBeUndefined();
  });

  it("does not invent cabinet height when cabinet bottom and gap exist without height", () => {
    const manualResult = calculateTvBackdropSetout({
      wallWidthMm: 3000,
      wallHeightMm: 2400,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1400,
      cabinetBottomAfflMm: DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM,
      cabinetToTvGapMm: 280,
      tvBottomAfflMm: 780,
    });
    const fallbackResult = calculateTvBackdropSetout({
      wallWidthMm: 3000,
      wallHeightMm: 2400,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1400,
      cabinetBottomAfflMm: DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM,
      cabinetToTvGapMm: 280,
    });

    expect(manualResult.tvBottomSource).toBe("manual");
    expect(manualResult.tvBottomAfflMm).toBe(780);
    expect(fallbackResult.tvBottomSource).toBe("default_visual_centre");
    expect(fallbackResult.tvCentreAfflMm).toBe(DEFAULT_TV_VISUAL_CENTRE_AFFL_MM);
    expect(fallbackResult.cabinetHeightMm).toBeUndefined();
  });

  it("keeps the backdrop centred on the TV when there is no cabinet collision", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3000,
      wallHeightMm: 2400,
      tvSizeInches: 75,
      backdropWidthMm: 2200,
      backdropHeightMm: 1000,
      tvBottomAfflMm: 760,
    });

    expect((result.backdropBottomAfflMm + result.backdropTopAfflMm) / 2).toBe(result.tvCentreAfflMm);
    expect(result.warnings.map(warning => warning.code)).not.toContain("backdrop_shifted_for_cabinet_clearance");
  });

  it("shifts the backdrop up to cabinet top plus 100 without moving the TV", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1600,
      cabinetBottomAfflMm: 0,
      cabinetHeightMm: 450,
      cabinetToTvGapMm: 250,
    });

    expect(result.tvBottomAfflMm).toBe(700);
    expect(result.cabinetTopAfflMm).toBe(450);
    expect(result.backdropBottomAfflMm).toBe(result.cabinetTopAfflMm! + MIN_BACKDROP_TO_CABINET_GAP_MM);
    expect(result.backdropTopAfflMm).toBe(result.backdropBottomAfflMm + result.backdropHeightMm);
    expect(result.warnings.map(warning => warning.code)).toContain("backdrop_shifted_for_cabinet_clearance");
  });

  it("warns when a shifted backdrop exceeds wall height but does not block the setout", () => {
    const result = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2000,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1600,
      cabinetBottomAfflMm: 150,
      cabinetHeightMm: 450,
      cabinetToTvGapMm: 250,
    });

    expect(result.backdropTopAfflMm).toBeGreaterThan(result.wallHeightMm);
    expect(result.warnings.map(warning => warning.code)).toEqual(
      expect.arrayContaining(["backdrop_shifted_for_cabinet_clearance", "backdrop_exceeds_wall"])
    );
  });

  it("warns for low cabinet cleaning access below 120 but not at 150", () => {
    const noWarningResult = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1220,
      cabinetBottomAfflMm: 150,
      cabinetHeightMm: 450,
      cabinetToTvGapMm: 250,
    });
    const warningResult = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2600,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1220,
      cabinetBottomAfflMm: 100,
      cabinetHeightMm: 450,
      cabinetToTvGapMm: 250,
    });

    expect(noWarningResult.warnings.map(warning => warning.code)).not.toContain("cabinet_bottom_cleaning_access_tight");
    expect(warningResult.warnings.map(warning => warning.code)).toContain("cabinet_bottom_cleaning_access_tight");
  });

  it("builds an installer summary with the expected setout values and source labels", () => {
    const setout = calculateTvBackdropSetout({
      wallWidthMm: 3600,
      wallHeightMm: 2000,
      tvSizeInches: 86,
      backdropWidthMm: 2420,
      backdropHeightMm: 1600,
      cabinetBottomAfflMm: 150,
      cabinetHeightMm: 450,
      cabinetToTvGapMm: 250,
    });

    const summary = buildTvBackdropInstallerSummary(setout);

    expect(summary.placementSourceLabel).toBe("Cabinet top + TV gap");
    expect(summary.rows).toEqual(
      expect.arrayContaining([
        { label: "Wall", value: "3600 x 2000 mm" },
        { label: "TV placement source", value: "Cabinet top + TV gap" },
        { label: "Cabinet bottom AFFL", value: "150 mm" },
        { label: "Cabinet top AFFL", value: "600 mm" },
        { label: "TV bottom AFFL", value: "850 mm" },
        { label: "Backdrop to cabinet gap", value: "100 mm" },
      ])
    );
    expect(summary.notes).toEqual(
      expect.arrayContaining([
        "Backdrop shifted upward to maintain 100 mm halo clearance above cabinet.",
        "CHECK: Backdrop extents exceed wall height. Confirm sheet size and top clearance on site.",
      ])
    );
  });
});
