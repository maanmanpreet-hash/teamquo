import { calculateSheetQuantity } from "@shared/materialIntelligence";
import { safeNumber } from "./formatters";

export function getBackdropDimensionsFromCatalogProduct(product: { widthMm?: number | null; heightMm?: number | null } | null | undefined) {
  const widthMm = safeNumber(product?.widthMm);
  const heightMm = safeNumber(product?.heightMm);
  if (!widthMm || !heightMm) return undefined;

  return widthMm >= heightMm
    ? { backdropWidthMm: widthMm, backdropHeightMm: heightMm }
    : { backdropWidthMm: heightMm, backdropHeightMm: widthMm };
}

export function calculateTvBackdrop(tvSizeInches: number) {
  const diagonalMm = tvSizeInches * 25.4;
  const ratioDiagonal = Math.sqrt(16 * 16 + 9 * 9);
  const tvWidthMm = Math.round((diagonalMm * 16) / ratioDiagonal);
  const tvHeightMm = Math.round((diagonalMm * 9) / ratioDiagonal);
  const backdropWidthMm = tvWidthMm + 200;
  const backdropHeightMm = tvHeightMm + 200;
  const pvcSheets = calculateSheetQuantity(backdropWidthMm, backdropHeightMm, 1220, 2900);
  const mdfSheets = calculateSheetQuantity(backdropWidthMm, backdropHeightMm, 1220, 2440);

  return {
    tvSizeInches,
    tvWidthMm,
    tvHeightMm,
    backdropWidthMm,
    backdropHeightMm,
    pvcSheets,
    mdfSheets,
    pvcGlueTubes: pvcSheets,
    minimumOverhangEachSideMm: 100,
  };
}
