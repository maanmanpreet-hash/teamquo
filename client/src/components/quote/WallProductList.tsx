import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/quote/formatters";
import {
  formatShelfHeightsBySection,
  formatPositiveNumberList,
} from "@/lib/quote/itemDetails";
import { formatProductHeading } from "@/lib/quote/productTypeHelpers";
import type { WallProduct } from "@/lib/quote/types";

interface WallProductListProps {
  formBusy: boolean;
  products: WallProduct[];
  wallId: string;
  onEditProduct: (wallId: string, product: WallProduct) => void;
  onRemoveProduct: (wallId: string, productId: string) => void;
}

export function WallProductList({
  formBusy,
  products,
  wallId,
  onEditProduct,
  onRemoveProduct,
}: WallProductListProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 border-t pt-3">
      {products.map(product => (
        <div key={product.id} className="rounded-lg bg-gray-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{formatProductHeading(product)}</p>
              <p className="text-sm text-gray-600">Qty {product.quantity} x {formatMoney(product.unitPrice)} = {formatMoney(product.quantity * product.unitPrice)}</p>
              {product.productType === "tv_backdrop" && product.catalogProductName && (
                <p className="text-xs text-gray-600">Marble sheet: {product.catalogProductName}</p>
              )}
              {product.productType === "tv_backdrop" && product.tvSizeInches && <p className="text-xs text-gray-600">TV size: {product.tvSizeInches}"</p>}
              {product.productType === "tv_backdrop" && product.backdropWidthMm && product.backdropHeightMm && (
                <p className="text-xs text-gray-600">
                  Backdrop: {product.backdropWidthMm} x {product.backdropHeightMm} mm
                </p>
              )}
              {product.productType === "tv_backdrop" && product.tvBottomAfflMm && (
                <p className="text-xs text-gray-600">TV bottom AFFL: {product.tvBottomAfflMm} mm</p>
              )}
              {product.productType === "tv_backdrop" && product.cabinetHeightFromFloorMm !== undefined && product.cabinetHeightMm && (
                <p className="text-xs text-gray-600">
                  Cabinet bottom AFFL: {product.cabinetHeightFromFloorMm} mm, height: {product.cabinetHeightMm} mm
                </p>
              )}
              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                product.cabinetWidthMm &&
                product.cabinetHeightMm &&
                product.cabinetDepthMm && (
                  <p className="text-xs text-gray-600">
                    Size: {product.cabinetWidthMm} W x {product.cabinetHeightMm} H x {product.cabinetDepthMm} D mm
                  </p>
                )}
              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                product.cabinetHeightFromFloorMm !== undefined && (
                  <p className="text-xs text-gray-600">
                    From floor: {product.cabinetHeightFromFloorMm} mm
                  </p>
                )}
              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                product.cabinetSectionWidthsMm?.length && (
                  <p className="text-xs text-gray-600">
                    Sections: {formatPositiveNumberList(product.cabinetSectionWidthsMm)} mm
                  </p>
                )}
              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                product.cabinetShelfHeightsBySectionMm?.length && (
                  <p className="text-xs text-gray-600">
                    Shelves by section: {formatShelfHeightsBySection(product.cabinetShelfHeightsBySectionMm)} mm
                  </p>
                )}
              {product.productType === "floating_cabinet" && product.clientPreferenceNotes && (
                <p className="text-xs text-gray-600">Client preference: {product.clientPreferenceNotes}</p>
              )}
              {product.productType === "tv_backdrop" && product.cabinetTopAfflMm && product.cabinetToTvGapMm && (
                <p className="text-xs text-gray-600">
                  Cabinet top AFFL: {product.cabinetTopAfflMm} mm, gap: {product.cabinetToTvGapMm} mm
                </p>
              )}
              {product.onsiteCarryoverNotes && (
                <p className="text-xs text-gray-600 whitespace-pre-line">Onsite notes: {product.onsiteCarryoverNotes}</p>
              )}
              {product.productType === "tv_backdrop" && product.includeTvBracket && <p className="text-xs text-gray-600">TV bracket: included internally</p>}
              {product.productType === "acoustic_panel" && product.acousticFixingMethod && product.acousticFixingMethod !== "none" && <p className="text-xs text-gray-600">Fixing: {product.acousticFixingMethod.replace(/_/g, " ")}</p>}
              {product.manualReviewRequired && <p className="text-xs font-semibold text-amber-700">Manual review required</p>}
            </div>
            <div className="flex items-center gap-1 self-start sm:self-auto">
              <Button
                onClick={() => onEditProduct(wallId, product)}
                disabled={formBusy}
                variant="ghost"
                size="sm"
                className="text-gray-600"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button onClick={() => onRemoveProduct(wallId, product.id)} disabled={formBusy} variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
