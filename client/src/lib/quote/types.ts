import type { ObstructionStatus, PanelCalculationResult } from "@shared/quoteCalculations";

export type WorkflowStep = "client" | "walls" | "review";

export type ProductTypeSlug =
  | "cladding"
  | "acoustic_panel"
  | "floating_cabinet"
  | "fireplace"
  | "mirror"
  | "marble_sheet"
  | "tv_backdrop"
  | "side_tower"
  | "shelving"
  | "custom_item";

export const customItemOptions = [
  "LEDs",
  "GPO cutouts",
  "Cable concealment",
  "TV bracket",
  "Other",
] as const;

export type CustomItemOption = (typeof customItemOptions)[number];

export type AcousticFixingMethod = "screws" | "glue" | "screws_and_glue" | "none";

export interface WallProduct {
  id: string;
  productType: ProductTypeSlug;
  productId: string;
  productName: string;
  catalogProductName?: string;
  quantity: number;
  unitPrice: number;
  panelWidthMm?: number;
  panelHeightMm?: number;
  panelCalculation?: PanelCalculationResult;
  manualReviewRequired?: boolean;
  reviewReasons?: string[];
  internalNotes?: string[];
  customerNotes?: string[];
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetDepthMm?: number;
  cabinetHeightFromFloorMm?: number;
  cabinetSectionWidthsMm?: number[];
  cabinetShelfHeightsBySectionMm?: number[][];
  clientPreferenceNotes?: string;
  acousticFixingMethod?: AcousticFixingMethod;
  tvSizeInches?: number;
  backdropWidthMm?: number;
  backdropHeightMm?: number;
  tvBottomAfflMm?: number;
  cabinetTopAfflMm?: number;
  cabinetToTvGapMm?: number;
  includeTvBracket?: boolean;
  customItemType?: CustomItemOption;
  itemDetails?: string;
}

export interface WallWithProducts {
  id: string;
  wallType: "regular" | "garage" | "custom";
  wallName: string;
  wallWidthMm: number;
  wallHeightMm: number;
  obstructionStatus: ObstructionStatus;
  obstructionNotes: string;
  supplyInstallPrice: number;
  products: WallProduct[];
}
