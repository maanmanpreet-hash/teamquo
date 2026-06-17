import { createTvWallInstallerElevationDocument, type TvBackdropSetoutDocumentInput } from "./elevationPresets";
import { renderElevationDocumentHtml, renderElevationPageSvg } from "./elevationRenderer";
import type { TvBackdropSetout } from "./tvSetout";

export interface TvBackdropSetoutDocument {
  quoteNumber: string;
  clientName: string;
  wallName: string;
  generatedDateLabel?: string;
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetHeightFromFloorMm?: number;
  cabinetSectionWidthsMm?: number[];
  setout: TvBackdropSetout;
}

export function formatSetoutMm(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)} mm`;
}

function buildElevationDocument(document: TvBackdropSetoutDocument) {
  return createTvWallInstallerElevationDocument(document satisfies TvBackdropSetoutDocumentInput);
}

export function generateTvBackdropSetoutSvg(document: TvBackdropSetoutDocument) {
  const elevation = buildElevationDocument(document);
  return renderElevationPageSvg(elevation.pages[0], elevation);
}

export function generateTvBackdropSetoutHtml(document: TvBackdropSetoutDocument) {
  return renderElevationDocumentHtml(buildElevationDocument(document));
}
