import type { TvBackdropSetout } from "../tvSetout";

export interface TvWallFeatureInput {
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetHeightFromFloorMm?: number;
  setout: TvBackdropSetout;
}

export interface TvWallScene {
  wallWidthMm: number;
  wallHeightMm: number;
  wallCentreX: number;
  featureCentreX: number;
  backdropLeftMm: number;
  backdropRightMm: number;
  backdropBottomAfflMm: number;
  backdropTopAfflMm: number;
  backdropWidthMm: number;
  backdropHeightMm: number;
  tvLeftMm: number;
  tvRightMm: number;
  tvBottomAfflMm: number;
  tvTopAfflMm: number;
  tvCentreX: number;
  tvCentreAfflMm: number;
  tvWidthMm: number;
  tvHeightMm: number;
  sideMarginMm: number;
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetBottomAfflMm?: number;
  cabinetTopAfflMm?: number;
  cabinetLeftMm?: number;
  cabinetRightMm?: number;
  cabinetCentreX?: number;
  cabinetToTvGapMm?: number;
}

export function buildTvWallScene(input: TvWallFeatureInput): TvWallScene {
  const { setout, cabinetWidthMm, cabinetHeightMm, cabinetHeightFromFloorMm } = input;
  const featureCentreX = (setout.backdropLeftMm + setout.backdropRightMm) / 2;
  const cabinetLeftMm =
    cabinetWidthMm && cabinetHeightMm && cabinetHeightFromFloorMm !== undefined
      ? featureCentreX - cabinetWidthMm / 2
      : undefined;
  const cabinetRightMm = cabinetLeftMm !== undefined && cabinetWidthMm !== undefined
    ? cabinetLeftMm + cabinetWidthMm
    : undefined;
  const cabinetTopAfflMm =
    cabinetHeightFromFloorMm !== undefined && cabinetHeightMm !== undefined
      ? cabinetHeightFromFloorMm + cabinetHeightMm
      : setout.cabinetTopAfflMm;

  return {
    wallWidthMm: setout.wallWidthMm,
    wallHeightMm: setout.wallHeightMm,
    wallCentreX: setout.wallCentreX,
    featureCentreX,
    backdropLeftMm: setout.backdropLeftMm,
    backdropRightMm: setout.backdropRightMm,
    backdropBottomAfflMm: setout.backdropBottomAfflMm,
    backdropTopAfflMm: setout.backdropTopAfflMm,
    backdropWidthMm: setout.backdropWidthMm,
    backdropHeightMm: setout.backdropHeightMm,
    tvLeftMm: setout.tvLeftMm,
    tvRightMm: setout.tvRightMm,
    tvBottomAfflMm: setout.tvBottomAfflMm,
    tvTopAfflMm: setout.tvTopAfflMm,
    tvCentreX: (setout.tvLeftMm + setout.tvRightMm) / 2,
    tvCentreAfflMm: setout.tvCentreAfflMm,
    tvWidthMm: setout.tvWidthMm,
    tvHeightMm: setout.tvHeightMm,
    sideMarginMm: setout.sideMarginMm,
    cabinetWidthMm,
    cabinetHeightMm,
    cabinetBottomAfflMm: cabinetHeightFromFloorMm ?? setout.cabinetBottomAfflMm,
    cabinetTopAfflMm,
    cabinetLeftMm,
    cabinetRightMm,
    cabinetCentreX: cabinetLeftMm !== undefined && cabinetRightMm !== undefined ? (cabinetLeftMm + cabinetRightMm) / 2 : undefined,
    cabinetToTvGapMm: setout.actualCabinetToTvGapMm,
  };
}
