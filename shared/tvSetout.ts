export interface TvBackdropSetoutInput {
  wallWidthMm: number;
  wallHeightMm: number;
  tvSizeInches: number;
  backdropWidthMm: number;
  backdropHeightMm: number;
  tvBottomAfflMm?: number | null;
  cabinetBottomAfflMm?: number | null;
  cabinetHeightMm?: number | null;
  cabinetTopAfflMm?: number | null;
  cabinetToTvGapMm?: number | null;
}

export const DEFAULT_TV_VISUAL_CENTRE_AFFL_MM = 1100;
export const DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM = 150;
export const DEFAULT_CABINET_TO_TV_GAP_MM = 250;
export const MIN_BACKDROP_TO_CABINET_GAP_MM = 100;

export interface TvBackdropSetoutWarning {
  code:
    | "tv_wider_than_backdrop"
    | "tv_taller_than_backdrop"
    | "backdrop_exceeds_wall"
    | "tv_exceeds_wall"
    | "tv_may_appear_low"
    | "tv_may_appear_high"
    | "top_margin_tight"
    | "side_margin_tight"
    | "cabinet_gap_tight"
    | "cabinet_gap_large"
    | "cabinet_bottom_cleaning_access_tight"
    | "backdrop_shifted_for_cabinet_clearance";
  message: string;
}

export interface TvBackdropSetout {
  wallWidthMm: number;
  wallHeightMm: number;
  tvSizeInches: number;
  diagonalMm: number;
  tvWidthMm: number;
  tvHeightMm: number;
  backdropWidthMm: number;
  backdropHeightMm: number;
  tvBottomAfflMm: number;
  tvTopAfflMm: number;
  tvCentreAfflMm: number;
  backdropBottomAfflMm: number;
  backdropTopAfflMm: number;
  wallCentreX: number;
  tvLeftMm: number;
  tvRightMm: number;
  backdropLeftMm: number;
  backdropRightMm: number;
  sideMarginMm: number;
  topMarginMm: number;
  bottomMarginMm: number;
  cabinetBottomAfflMm?: number;
  cabinetHeightMm?: number;
  cabinetTopAfflMm?: number;
  cabinetToTvGapMm?: number;
  actualCabinetToTvGapMm?: number;
  tvBottomDerivedFromCabinetGap: boolean;
  tvBottomSource: "cabinet_bottom_and_height" | "cabinet_top" | "manual" | "default_visual_centre";
  warnings: TvBackdropSetoutWarning[];
}

export interface TvBackdropInstallerSummaryRow {
  label: string;
  value: string;
}

export interface TvBackdropInstallerSummary {
  placementSourceLabel: string;
  rows: TvBackdropInstallerSummaryRow[];
  notes: string[];
}

function asPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function asNonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatMmLabel(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)} mm`;
}

export function getTvPlacementSourceLabel(source: TvBackdropSetout["tvBottomSource"]) {
  switch (source) {
    case "cabinet_bottom_and_height":
    case "cabinet_top":
      return "Cabinet top + TV gap";
    case "manual":
      return "Manual TV bottom override";
    case "default_visual_centre":
      return "Standard 1100 mm visual centre";
  }
}

export function buildTvBackdropInstallerSummary(setout: TvBackdropSetout): TvBackdropInstallerSummary {
  const cabinetTopAfflMm =
    setout.cabinetTopAfflMm ??
    (setout.cabinetBottomAfflMm !== undefined && setout.cabinetHeightMm !== undefined
      ? setout.cabinetBottomAfflMm + setout.cabinetHeightMm
      : undefined);
  const backdropToCabinetGapMm =
    cabinetTopAfflMm !== undefined ? setout.backdropBottomAfflMm - cabinetTopAfflMm : undefined;
  const tvTopClearanceMm = setout.wallHeightMm - setout.tvTopAfflMm;
  const backdropTopClearanceMm = setout.wallHeightMm - setout.backdropTopAfflMm;

  return {
    placementSourceLabel: getTvPlacementSourceLabel(setout.tvBottomSource),
    rows: [
      { label: "Wall", value: `${Math.round(setout.wallWidthMm)} x ${Math.round(setout.wallHeightMm)} mm` },
      { label: "TV", value: `${setout.tvSizeInches}" | ${Math.round(setout.tvWidthMm)} x ${Math.round(setout.tvHeightMm)} mm` },
      { label: "TV placement source", value: getTvPlacementSourceLabel(setout.tvBottomSource) },
      ...(setout.cabinetBottomAfflMm !== undefined
        ? [{ label: "Cabinet bottom AFFL", value: formatMmLabel(setout.cabinetBottomAfflMm) }]
        : []),
      ...(cabinetTopAfflMm !== undefined
        ? [{ label: "Cabinet top AFFL", value: formatMmLabel(cabinetTopAfflMm) }]
        : []),
      { label: "TV bottom AFFL", value: formatMmLabel(setout.tvBottomAfflMm) },
      { label: "TV top AFFL", value: formatMmLabel(setout.tvTopAfflMm) },
      { label: "Backdrop bottom AFFL", value: formatMmLabel(setout.backdropBottomAfflMm) },
      { label: "Backdrop top AFFL", value: formatMmLabel(setout.backdropTopAfflMm) },
      ...(setout.actualCabinetToTvGapMm !== undefined
        ? [{ label: "Cabinet to TV gap", value: formatMmLabel(setout.actualCabinetToTvGapMm) }]
        : []),
      ...(backdropToCabinetGapMm !== undefined
        ? [{ label: "Backdrop to cabinet gap", value: formatMmLabel(backdropToCabinetGapMm) }]
        : []),
      { label: "TV top clearance", value: formatMmLabel(tvTopClearanceMm) },
      { label: "Backdrop top clearance", value: formatMmLabel(backdropTopClearanceMm) },
    ],
    notes: setout.warnings.map(warning => warning.message),
  };
}

export function calculateTvBackdropSetout(input: TvBackdropSetoutInput): TvBackdropSetout {
  const wallWidthMm = asPositiveNumber(input.wallWidthMm);
  const wallHeightMm = asPositiveNumber(input.wallHeightMm);
  const tvSizeInches = asPositiveNumber(input.tvSizeInches);
  const backdropWidthMm = asPositiveNumber(input.backdropWidthMm);
  const backdropHeightMm = asPositiveNumber(input.backdropHeightMm);

  if (!wallWidthMm || !wallHeightMm || !tvSizeInches || !backdropWidthMm || !backdropHeightMm) {
    throw new Error("Wall, TV, and backdrop dimensions must be valid positive numbers");
  }

  const cabinetBottomAfflMm = asNonNegativeNumber(input.cabinetBottomAfflMm);
  const cabinetHeightMm = asPositiveNumber(input.cabinetHeightMm);
  const explicitCabinetTopAfflMm = asNonNegativeNumber(input.cabinetTopAfflMm);
  const explicitCabinetToTvGapMm = asPositiveNumber(input.cabinetToTvGapMm);
  const manualTvBottomAfflMm = asNonNegativeNumber(input.tvBottomAfflMm);

  const diagonalMm = tvSizeInches * 25.4;
  const tvWidthMm = Math.round(diagonalMm * 0.8716);
  const tvHeightMm = Math.round(diagonalMm * 0.4903);

  // The floating cabinet composition is driven by cabinet top plus the TV gap.
  // Cabinet height remains a custom operator input and must never be defaulted.
  const resolvedCabinetBottomAfflMm =
    cabinetHeightMm !== undefined
      ? cabinetBottomAfflMm ?? DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM
      : cabinetBottomAfflMm;
  const resolvedCabinetToTvGapMm =
    cabinetHeightMm !== undefined || explicitCabinetTopAfflMm !== undefined
      ? explicitCabinetToTvGapMm ?? DEFAULT_CABINET_TO_TV_GAP_MM
      : explicitCabinetToTvGapMm;
  const derivedCabinetTopAfflMm =
    resolvedCabinetBottomAfflMm !== undefined && cabinetHeightMm !== undefined
      ? resolvedCabinetBottomAfflMm + cabinetHeightMm
      : undefined;
  const cabinetTopAfflMm = derivedCabinetTopAfflMm ?? explicitCabinetTopAfflMm;

  let tvBottomAfflMm: number | undefined;
  let tvBottomSource: TvBackdropSetout["tvBottomSource"] | undefined;

  if (
    resolvedCabinetBottomAfflMm !== undefined &&
    cabinetHeightMm !== undefined &&
    resolvedCabinetToTvGapMm !== undefined
  ) {
    tvBottomAfflMm = resolvedCabinetBottomAfflMm + cabinetHeightMm + resolvedCabinetToTvGapMm;
    tvBottomSource = "cabinet_bottom_and_height";
  } else if (cabinetTopAfflMm !== undefined && resolvedCabinetToTvGapMm !== undefined) {
    tvBottomAfflMm = cabinetTopAfflMm + resolvedCabinetToTvGapMm;
    tvBottomSource = "cabinet_top";
  } else if (manualTvBottomAfflMm !== undefined) {
    tvBottomAfflMm = manualTvBottomAfflMm;
    tvBottomSource = "manual";
  } else {
    // 1100 mm is the standard sofa-viewing visual centre baseline.
    // It is not bracket, VESA, fixing-hole, mounting-rail, or "mounting" height.
    tvBottomAfflMm = Math.round(DEFAULT_TV_VISUAL_CENTRE_AFFL_MM - tvHeightMm / 2);
    tvBottomSource = "default_visual_centre";
  }

  const finalCabinetBottomAfflMm =
    resolvedCabinetBottomAfflMm ??
    (cabinetTopAfflMm !== undefined && cabinetHeightMm !== undefined
      ? cabinetTopAfflMm - cabinetHeightMm
      : undefined);
  const tvBottomDerivedFromCabinetGap = tvBottomSource === "cabinet_bottom_and_height" || tvBottomSource === "cabinet_top";
  const tvTopAfflMm = tvBottomAfflMm + tvHeightMm;
  const tvCentreAfflMm = tvBottomAfflMm + tvHeightMm / 2;
  let backdropBottomAfflMm = tvCentreAfflMm - backdropHeightMm / 2;
  let backdropTopAfflMm = tvCentreAfflMm + backdropHeightMm / 2;
  const wallCentreX = wallWidthMm / 2;
  const tvLeftMm = wallCentreX - tvWidthMm / 2;
  const tvRightMm = wallCentreX + tvWidthMm / 2;
  const backdropLeftMm = wallCentreX - backdropWidthMm / 2;
  const backdropRightMm = wallCentreX + backdropWidthMm / 2;
  const sideMarginMm = (backdropWidthMm - tvWidthMm) / 2;
  const actualCabinetToTvGapMm = cabinetTopAfflMm !== undefined ? tvBottomAfflMm - cabinetTopAfflMm : undefined;
  const warnings: TvBackdropSetoutWarning[] = [];

  // The backdrop stays centred on the TV by default, but cabinet clearance wins
  // for the backdrop only so the media wall keeps enough halo-light separation.
  if (
    cabinetTopAfflMm !== undefined &&
    backdropBottomAfflMm < cabinetTopAfflMm + MIN_BACKDROP_TO_CABINET_GAP_MM
  ) {
    backdropBottomAfflMm = cabinetTopAfflMm + MIN_BACKDROP_TO_CABINET_GAP_MM;
    backdropTopAfflMm = backdropBottomAfflMm + backdropHeightMm;
    warnings.push({
      code: "backdrop_shifted_for_cabinet_clearance",
      message: "Backdrop shifted upward to maintain 100 mm halo clearance above cabinet.",
    });
  }

  const topMarginMm = backdropTopAfflMm - tvTopAfflMm;
  const bottomMarginMm = tvBottomAfflMm - backdropBottomAfflMm;

  if (tvWidthMm > backdropWidthMm) {
    warnings.push({ code: "tv_wider_than_backdrop", message: "TV is wider than the backdrop." });
  }
  if (tvHeightMm > backdropHeightMm) {
    warnings.push({ code: "tv_taller_than_backdrop", message: "TV is taller than the backdrop." });
  }
  if (backdropBottomAfflMm < 0 || backdropTopAfflMm > wallHeightMm) {
    warnings.push({ code: "backdrop_exceeds_wall", message: "CHECK: Backdrop extents exceed wall height. Confirm sheet size and top clearance on site." });
  }
  if (tvBottomAfflMm < 0 || tvTopAfflMm > wallHeightMm) {
    warnings.push({ code: "tv_exceeds_wall", message: "CHECK: TV extents exceed wall height. Review final TV setout before install." });
  }
  if (tvCentreAfflMm < 950) {
    warnings.push({ code: "tv_may_appear_low", message: "CHECK: TV centre may feel low for seated viewing." });
  }
  if (tvCentreAfflMm > 1350) {
    warnings.push({ code: "tv_may_appear_high", message: "CHECK: TV centre is high. Review cabinet height, TV gap, TV size, or manual setout." });
  } else if (tvCentreAfflMm > 1250) {
    warnings.push({ code: "tv_may_appear_high", message: "CHECK: TV centre may feel high for seated viewing." });
  }
  if (topMarginMm < 60) {
    warnings.push({ code: "top_margin_tight", message: "CHECK: Backdrop top margin is visually tight." });
  }
  if (sideMarginMm < 80) {
    warnings.push({ code: "side_margin_tight", message: "CHECK: Backdrop side margins are visually tight." });
  }
  if (actualCabinetToTvGapMm !== undefined && actualCabinetToTvGapMm < 150) {
    warnings.push({ code: "cabinet_gap_tight", message: "CHECK: Cabinet to TV gap is visually tight." });
  }
  if (actualCabinetToTvGapMm !== undefined && actualCabinetToTvGapMm > 350) {
    warnings.push({ code: "cabinet_gap_large", message: "CHECK: Cabinet to TV gap is visually large." });
  }
  if (finalCabinetBottomAfflMm !== undefined && finalCabinetBottomAfflMm < 120) {
    warnings.push({
      code: "cabinet_bottom_cleaning_access_tight",
      message: "CHECK: Floating cabinet bottom clearance may restrict robot vacuum or cleaning access.",
    });
  }

  return {
    wallWidthMm,
    wallHeightMm,
    tvSizeInches,
    diagonalMm,
    tvWidthMm,
    tvHeightMm,
    backdropWidthMm,
    backdropHeightMm,
    tvBottomAfflMm,
    tvTopAfflMm,
    tvCentreAfflMm,
    backdropBottomAfflMm,
    backdropTopAfflMm,
    wallCentreX,
    tvLeftMm,
    tvRightMm,
    backdropLeftMm,
    backdropRightMm,
    sideMarginMm,
    topMarginMm,
    bottomMarginMm,
    cabinetBottomAfflMm: finalCabinetBottomAfflMm,
    cabinetHeightMm,
    cabinetTopAfflMm,
    cabinetToTvGapMm: resolvedCabinetToTvGapMm,
    actualCabinetToTvGapMm,
    tvBottomDerivedFromCabinetGap,
    tvBottomSource: tvBottomSource!,
    warnings,
  };
}
