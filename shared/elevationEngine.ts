import type {
  ElevationDocument,
  ElevationHorizontalDimension,
  ElevationMarkList,
  ElevationPage,
  ElevationRailMark,
  ElevationRectObject,
  ElevationLineObject,
  ElevationSceneObject,
  ElevationTextObject,
  ElevationVerticalDimension,
} from "./elevationScene";

export interface FloatingCabinetSectionInput {
  widthMm?: number;
  shelfHeightsMm?: number[];
}

export type NormalisedSection = {
  widthMm: number;
  shelfHeightsMm: number[];
};

export type ElevationDocumentHeader = Pick<
  ElevationDocument,
  "documentTitle" | "documentSubtitle" | "metaRightTop" | "metaRightBottom" | "presetKind"
>;

export function formatMm(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)} mm`;
}

export function formatDocSubtitle(quoteNumber: string, clientName: string, itemName: string) {
  return `${quoteNumber} | ${clientName} | ${itemName}`;
}

export function createRectObject(object: ElevationRectObject): ElevationRectObject {
  return object;
}

export function createLineObject(object: ElevationLineObject): ElevationLineObject {
  return object;
}

export function createTextObject(object: ElevationTextObject): ElevationTextObject {
  return object;
}

export function createRailMark(mark: ElevationRailMark): ElevationRailMark {
  return mark;
}

export function createVerticalDimension(dimension: ElevationVerticalDimension): ElevationVerticalDimension {
  return dimension;
}

export function createHorizontalDimension(dimension: ElevationHorizontalDimension): ElevationHorizontalDimension {
  return dimension;
}

export function createMarkList(markList: ElevationMarkList): ElevationMarkList {
  return markList;
}

export function createDocument(header: ElevationDocumentHeader, pages: ElevationPage[]): ElevationDocument {
  return {
    ...header,
    units: "mm",
    paper: "A4-landscape",
    materialThicknessMm: 16,
    pages,
  };
}

export function normaliseSections(widthMm: number, sections: FloatingCabinetSectionInput[] | undefined): NormalisedSection[] {
  if (!sections?.length) {
    return [{ widthMm, shelfHeightsMm: [] }];
  }

  const rawWidths = sections.map(section => (section.widthMm && section.widthMm > 0 ? section.widthMm : 0));
  const total = rawWidths.reduce((sum, value) => sum + value, 0);
  const fallbackWidth = widthMm / sections.length;

  return sections.map((section, index) => ({
    widthMm: total > 0 ? (rawWidths[index] / total) * widthMm : fallbackWidth,
    shelfHeightsMm: (section.shelfHeightsMm || []).filter(height => height > 0),
  }));
}

export function createProductionPage(page: Omit<ElevationPage, "annotationMode">): ElevationPage {
  return {
    ...page,
    annotationMode: "production",
  };
}

export function createInstallerPage(page: Omit<ElevationPage, "annotationMode">): ElevationPage {
  return {
    ...page,
    annotationMode: "installer",
  };
}

export function pushObjects(target: ElevationSceneObject[], ...objects: ElevationSceneObject[]) {
  target.push(...objects);
}
