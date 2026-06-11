import {
  buildQuoteMaterialSummary,
  type AcousticFixingMethod,
  type ProductSelectionForMaterials,
  type QuoteProductType,
  type WallForMaterials,
} from "@shared/materialIntelligence";

export interface QuoteFormWallForMaterials {
  wallName: string;
  wallWidthMm: number;
  wallHeightMm: number;
  products: Array<{
    productType: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    acousticFixingMethod?: string;
    tvSizeInches?: number;
    includeTvBracket?: boolean;
  }>;
}

const allowedProductTypes = new Set<QuoteProductType>([
  "cladding",
  "acoustic_panel",
  "floating_cabinet",
  "fireplace",
  "mirror",
  "marble_sheet",
  "tv_backdrop",
  "side_tower",
  "shelving",
]);

const allowedAcousticFixingMethods = new Set<AcousticFixingMethod>([
  "screws",
  "glue",
  "screws_and_glue",
  "none",
]);

function toQuoteProductType(productType: string): QuoteProductType {
  return allowedProductTypes.has(productType as QuoteProductType)
    ? (productType as QuoteProductType)
    : "cladding";
}

function toAcousticFixingMethod(value: string | undefined): AcousticFixingMethod | undefined {
  if (!value) return undefined;
  return allowedAcousticFixingMethods.has(value as AcousticFixingMethod)
    ? (value as AcousticFixingMethod)
    : undefined;
}

export function mapQuoteWallsForMaterialSummary(walls: QuoteFormWallForMaterials[]): WallForMaterials[] {
  return walls.map(wall => ({
    wallName: wall.wallName,
    wallWidthMm: wall.wallWidthMm,
    wallHeightMm: wall.wallHeightMm,
    products: wall.products.map<ProductSelectionForMaterials>(product => ({
      productType: toQuoteProductType(product.productType),
      productName: product.productName,
      quantity: product.quantity,
      unitCostCents: product.unitPrice,
      acousticFixingMethod: toAcousticFixingMethod(product.acousticFixingMethod),
      tvSizeInches: product.tvSizeInches,
      includeTvBracket: product.includeTvBracket,
    })),
  }));
}

export function buildQuoteFormMaterialSummary(walls: QuoteFormWallForMaterials[]) {
  return buildQuoteMaterialSummary(mapQuoteWallsForMaterialSummary(walls));
}
