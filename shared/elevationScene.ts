export type ElevationObjectFamily =
  | "cabinet"
  | "tv"
  | "backdrop"
  | "tall_tower"
  | "overhead"
  | "wardrobe_bay"
  | "shelf"
  | "base_cabinet"
  | "filler"
  | "appliance"
  | "door_panel"
  | "drawer_front"
  | "void"
  | "panel";

export type ElevationPageLayout =
  | "installer_setout"
  | "tv_installer_setout"
  | "tv_installer_affl"
  | "tv_front_elevation"
  | "production_overall"
  | "production_internal";

export type ElevationAnnotationMode = "installer" | "production";

export type ElevationPresetKind =
  | "tv_wall"
  | "floating_cabinet"
  | "tall_tower"
  | "overhead_run"
  | "wardrobe_bay"
  | "base_cabinet"
  | "custom_cabinetry";

export type ElevationViewKind = "setout" | "front" | "internal";

export interface ElevationRectObject {
  kind: "rect";
  id: string;
  family: ElevationObjectFamily;
  xMm: number;
  bottomMm: number;
  widthMm: number;
  heightMm: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  fillOpacity?: number;
  radiusPx?: number;
}

export interface ElevationLineObject {
  kind: "line";
  id: string;
  family: ElevationObjectFamily;
  x1Mm: number;
  y1Mm: number;
  x2Mm: number;
  y2Mm: number;
  stroke: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  dashArray?: string;
}

export interface ElevationTextObject {
  kind: "text";
  id: string;
  family: ElevationObjectFamily;
  xMm: number;
  yMm: number;
  text: string;
  fontSizePx?: number;
  fontWeight?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
}

export type ElevationSceneObject =
  | ElevationRectObject
  | ElevationLineObject
  | ElevationTextObject;

export interface ElevationRailMark {
  id: string;
  label: string;
  valueMm: number;
  targetYmm: number;
  witnessXmm: number;
  guideEndXmm?: number;
}

export interface ElevationVerticalDimension {
  id: string;
  label: string;
  valueMm: number;
  topYmm: number;
  bottomYmm: number;
  witnessXmm: number;
  side: "left" | "right";
  stack: number;
}

export interface ElevationHorizontalDimension {
  id: string;
  label: string;
  valueMm: number;
  leftXmm: number;
  rightXmm: number;
  witnessYmm: number;
  row: number;
  align?: "start" | "center";
}

export interface ElevationInfoRow {
  label: string;
  value: string;
}

export interface ElevationMarkList {
  title: string;
  rows: Array<{
    label: string;
    valueMm: number;
  }>;
}

export interface ElevationPage {
  id: string;
  title: string;
  layout: ElevationPageLayout;
  presetKind: ElevationPresetKind;
  annotationMode: ElevationAnnotationMode;
  viewKind: ElevationViewKind;
  sceneWidthMm: number;
  sceneHeightMm: number;
  objects: ElevationSceneObject[];
  railMarks?: ElevationRailMark[];
  verticalDimensions?: ElevationVerticalDimension[];
  horizontalDimensions?: ElevationHorizontalDimension[];
  markList?: ElevationMarkList;
  infoRows?: ElevationInfoRow[];
}

export interface ElevationDocument {
  documentTitle: string;
  documentSubtitle: string;
  presetKind?: ElevationPresetKind;
  metaRightTop?: string;
  metaRightBottom?: string;
  units: "mm";
  paper: "A4-landscape";
  materialThicknessMm: number;
  pages: ElevationPage[];
}
