import type { JobItem, Product, Wall } from "../drizzle/schema";
import {
  buildQuoteMaterialSummary,
  type AcousticFixingMethod,
  type QuoteMaterialSummary,
  type WallForMaterials,
} from "../shared/materialIntelligence";

type WallSummary = Pick<Wall, "id" | "wallName" | "wallType" | "wallWidthMm" | "wallHeightMm" | "notes">;

function parseItemDetails(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseAcousticFixingMethod(value: unknown): AcousticFixingMethod | undefined {
  return value === "screws" || value === "glue" || value === "screws_and_glue" || value === "none"
    ? value
    : undefined;
}

function mapJobToMaterialWalls(
  wallEntries: Array<[WallSummary, JobItem[]]>,
  products: Map<number, Product>
): WallForMaterials[] {
  return wallEntries.map(([wall, items]) => ({
    wallName: wall.wallName || "Wall",
    wallWidthMm: wall.wallWidthMm || 0,
    wallHeightMm: wall.wallHeightMm || 0,
    products: items.flatMap(item => {
      if (item.itemType === "custom_item") return [];
      const product = item.productId ? products.get(item.productId) : undefined;
      const itemDetails = parseItemDetails(item.itemDetails);
      return [{
        productType: item.itemType,
        productName: product?.name || item.itemType,
        quantity: item.quantityRequired || 1,
        unitCostCents: item.unitPrice || undefined,
        includeTvBracket: Boolean(itemDetails.includeTvBracket),
        tvSizeInches: safeNumber(itemDetails.tvSizeInches),
        acousticFixingMethod: parseAcousticFixingMethod(itemDetails.fixingMethod) ?? parseAcousticFixingMethod(itemDetails.acousticFixingMethod),
      }];
    }),
  }));
}

export function buildJobMaterialSummary(
  items: JobItem[],
  products: Map<number, Product>,
  walls: Map<number, WallSummary>
): QuoteMaterialSummary {
  const wallEntries = Array.from(
    items.reduce((groups, item) => {
      const wall = walls.get(item.wallId || 0);
      if (!wall) return groups;
      const existing = groups.get(wall.id) || [];
      existing.push(item);
      groups.set(wall.id, existing);
      return groups;
    }, new Map<number, JobItem[]>())
  ).map(([wallId, wallItems]) => [walls.get(wallId)!, wallItems] as [WallSummary, JobItem[]]);

  return buildQuoteMaterialSummary(mapJobToMaterialWalls(wallEntries, products));
}
