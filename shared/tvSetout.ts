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
    | "cabinet_gap_large";
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
  tvBottomSource: "cabinet_bottom_and_height" | "cabinet_top" | "manual";
  warnings: TvBackdropSetoutWarning[];
}

function asPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function asNonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
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
  const cabinetToTvGapMm = asPositiveNumber(input.cabinetToTvGapMm);
  const manualTvBottomAfflMm = asNonNegativeNumber(input.tvBottomAfflMm);
  const derivedCabinetTopAfflMm =
    cabinetBottomAfflMm !== undefined && cabinetHeightMm !== undefined
      ? cabinetBottomAfflMm + cabinetHeightMm
      : undefined;
  const cabinetTopAfflMm = derivedCabinetTopAfflMm ?? explicitCabinetTopAfflMm;

  let tvBottomAfflMm: number | undefined;
  let tvBottomSource: TvBackdropSetout["tvBottomSource"] | undefined;

  if (
    cabinetBottomAfflMm !== undefined &&
    cabinetHeightMm !== undefined &&
    cabinetToTvGapMm !== undefined
  ) {
    tvBottomAfflMm = cabinetBottomAfflMm + cabinetHeightMm + cabinetToTvGapMm;
    tvBottomSource = "cabinet_bottom_and_height";
  } else if (cabinetTopAfflMm !== undefined && cabinetToTvGapMm !== undefined) {
    tvBottomAfflMm = cabinetTopAfflMm + cabinetToTvGapMm;
    tvBottomSource = "cabinet_top";
  } else if (manualTvBottomAfflMm !== undefined) {
    tvBottomAfflMm = manualTvBottomAfflMm;
    tvBottomSource = "manual";
  }

  const resolvedCabinetBottomAfflMm =
    cabinetBottomAfflMm ??
    (cabinetTopAfflMm !== undefined && cabinetHeightMm !== undefined
      ? cabinetTopAfflMm - cabinetHeightMm
      : undefined);
  const tvBottomDerivedFromCabinetGap = tvBottomSource === "cabinet_bottom_and_height" || tvBottomSource === "cabinet_top";

  if (!tvBottomAfflMm) {
    throw new Error("TV bottom AFFL is required unless cabinet bottom plus height and cabinet-to-TV gap, or cabinet top plus cabinet-to-TV gap, are provided");
  }

  const diagonalMm = tvSizeInches * 25.4;
  const tvWidthMm = Math.round(diagonalMm * 0.8716);
  const tvHeightMm = Math.round(diagonalMm * 0.4903);
  const tvTopAfflMm = tvBottomAfflMm + tvHeightMm;
  const tvCentreAfflMm = tvBottomAfflMm + tvHeightMm / 2;
  const backdropBottomAfflMm = tvCentreAfflMm - backdropHeightMm / 2;
  const backdropTopAfflMm = tvCentreAfflMm + backdropHeightMm / 2;
  const wallCentreX = wallWidthMm / 2;
  const tvLeftMm = wallCentreX - tvWidthMm / 2;
  const tvRightMm = wallCentreX + tvWidthMm / 2;
  const backdropLeftMm = wallCentreX - backdropWidthMm / 2;
  const backdropRightMm = wallCentreX + backdropWidthMm / 2;
  const sideMarginMm = (backdropWidthMm - tvWidthMm) / 2;
  const topMarginMm = backdropTopAfflMm - tvTopAfflMm;
  const bottomMarginMm = tvBottomAfflMm - backdropBottomAfflMm;
  const actualCabinetToTvGapMm = cabinetTopAfflMm !== undefined ? tvBottomAfflMm - cabinetTopAfflMm : undefined;
  const warnings: TvBackdropSetoutWarning[] = [];

  if (tvWidthMm > backdropWidthMm) {
    warnings.push({ code: "tv_wider_than_backdrop", message: "TV is wider than the backdrop." });
  }
  if (tvHeightMm > backdropHeightMm) {
    warnings.push({ code: "tv_taller_than_backdrop", message: "TV is taller than the backdrop." });
  }
  if (backdropBottomAfflMm < 0 || backdropTopAfflMm > wallHeightMm) {
    warnings.push({ code: "backdrop_exceeds_wall", message: "Backdrop exceeds wall height limits." });
  }
  if (tvBottomAfflMm < 0 || tvTopAfflMm > wallHeightMm) {
    warnings.push({ code: "tv_exceeds_wall", message: "TV exceeds wall height limits." });
  }
  if (tvBottomAfflMm < 650) {
    warnings.push({ code: "tv_may_appear_low", message: "TV bottom AFFL may appear low." });
  }
  if (tvBottomAfflMm > 850) {
    warnings.push({ code: "tv_may_appear_high", message: "TV bottom AFFL may appear high." });
  }
  if (topMarginMm < 60) {
    warnings.push({ code: "top_margin_tight", message: "Backdrop top margin is visually tight." });
  }
  if (sideMarginMm < 80) {
    warnings.push({ code: "side_margin_tight", message: "Backdrop side margin is visually tight." });
  }
  if (actualCabinetToTvGapMm !== undefined && actualCabinetToTvGapMm < 150) {
    warnings.push({ code: "cabinet_gap_tight", message: "Cabinet-to-TV gap is visually tight." });
  }
  if (actualCabinetToTvGapMm !== undefined && actualCabinetToTvGapMm > 350) {
    warnings.push({ code: "cabinet_gap_large", message: "Cabinet-to-TV gap is visually large." });
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
    cabinetBottomAfflMm: resolvedCabinetBottomAfflMm,
    cabinetHeightMm,
    cabinetTopAfflMm,
    cabinetToTvGapMm,
    actualCabinetToTvGapMm,
    tvBottomDerivedFromCabinetGap,
    tvBottomSource: tvBottomSource!,
    warnings,
  };
}
