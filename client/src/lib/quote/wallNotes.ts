import { decodeWallMeta, encodeWallMeta } from "@shared/quote";
import type { WallWithProducts } from "./types";

// Guardrail: associated/material cost is internal-only operator guidance.
// Manual Supply & Install price is the customer-facing wall price and must stay separate.
export const decodeWallNotes = decodeWallMeta;
export const encodeWallNotes = encodeWallMeta;

export function calculateWallProductEstimate(wall: Pick<WallWithProducts, "products">) {
  return wall.products.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);
}

export function hasManualWallSupplyInstallPrice(wall: Pick<WallWithProducts, "supplyInstallPrice">) {
  return wall.supplyInstallPrice > 0;
}

export function getWallAssociatedCost(wall: Pick<WallWithProducts, "products">) {
  return calculateWallProductEstimate(wall);
}

export function getManualWallSupplyInstallPrice(wall: Pick<WallWithProducts, "supplyInstallPrice">) {
  return hasManualWallSupplyInstallPrice(wall) ? wall.supplyInstallPrice : 0;
}
