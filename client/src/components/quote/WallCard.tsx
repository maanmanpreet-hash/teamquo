import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMetres } from "@/lib/quote/formatters";
import type {
  AcousticFixingMethod,
  CustomItemOption,
  ProductTypeSlug,
  WallProduct,
  WallWithProducts,
} from "@/lib/quote/types";

import { ProductPicker } from "./ProductPicker";
import { WallProductList } from "./WallProductList";

interface WallCardProps {
  wall: WallWithProducts;
  formBusy: boolean;
  isProductPickerOpen: boolean;
  editingProductId: string | null;
  tempProductType: ProductTypeSlug | null;
  tempProductId: string;
  tempCustomItemType: CustomItemOption | "";
  productsByType?: any[];
  activeWallFloatingCabinet?: WallProduct;
  selectedBackdropDimensions?: {
    backdropWidthMm: number;
    backdropHeightMm: number;
  };
  tempCabinetWidth: string;
  tempCabinetHeight: string;
  tempCabinetDepth: string;
  tempCabinetHeightFromFloor: string;
  tempCabinetSectionWidths: string;
  tempCabinetShelfHeightsBySection: string;
  tempClientPreferenceNotes: string;
  tempTvSizeInches: string;
  tempTvBottomAfflMm: string;
  tempCabinetToTvGapMm: string;
  tempIncludeTvBracket: boolean;
  tempAcousticFixingMethod: AcousticFixingMethod;
  onOpenProductPicker: (wallId: string) => void;
  onDeleteWall: (wallId: string) => void;
  onEditProduct: (wallId: string, product: WallProduct) => void;
  onRemoveProduct: (wallId: string, productId: string) => void;
  onProductTypeChange: (value: ProductTypeSlug) => void;
  onProductIdChange: (value: string) => void;
  onCustomItemTypeChange: (value: CustomItemOption) => void;
  onSubmitProduct: (wallId: string) => void;
  onCloseProductPicker: () => void;
  onTempCabinetWidthChange: (value: string) => void;
  onTempCabinetHeightChange: (value: string) => void;
  onTempCabinetDepthChange: (value: string) => void;
  onTempCabinetHeightFromFloorChange: (value: string) => void;
  onTempCabinetSectionWidthsChange: (value: string) => void;
  onTempCabinetShelfHeightsBySectionChange: (value: string) => void;
  onTempClientPreferenceNotesChange: (value: string) => void;
  onTempTvSizeInchesChange: (value: string) => void;
  onTempTvBottomAfflMmChange: (value: string) => void;
  onTempCabinetToTvGapMmChange: (value: string) => void;
  onTempIncludeTvBracketChange: (checked: boolean) => void;
  onTempAcousticFixingMethodChange: (value: AcousticFixingMethod) => void;
}

export function WallCard({
  wall,
  formBusy,
  isProductPickerOpen,
  editingProductId,
  tempProductType,
  tempProductId,
  tempCustomItemType,
  productsByType,
  activeWallFloatingCabinet,
  selectedBackdropDimensions,
  tempCabinetWidth,
  tempCabinetHeight,
  tempCabinetDepth,
  tempCabinetHeightFromFloor,
  tempCabinetSectionWidths,
  tempCabinetShelfHeightsBySection,
  tempClientPreferenceNotes,
  tempTvSizeInches,
  tempTvBottomAfflMm,
  tempCabinetToTvGapMm,
  tempIncludeTvBracket,
  tempAcousticFixingMethod,
  onOpenProductPicker,
  onDeleteWall,
  onEditProduct,
  onRemoveProduct,
  onProductTypeChange,
  onProductIdChange,
  onCustomItemTypeChange,
  onSubmitProduct,
  onCloseProductPicker,
  onTempCabinetWidthChange,
  onTempCabinetHeightChange,
  onTempCabinetDepthChange,
  onTempCabinetHeightFromFloorChange,
  onTempCabinetSectionWidthsChange,
  onTempCabinetShelfHeightsBySectionChange,
  onTempClientPreferenceNotesChange,
  onTempTvSizeInchesChange,
  onTempTvBottomAfflMmChange,
  onTempCabinetToTvGapMmChange,
  onTempIncludeTvBracketChange,
  onTempAcousticFixingMethodChange,
}: WallCardProps) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold">{wall.wallName}</h3>
          <p className="text-sm text-gray-600">{formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isProductPickerOpen && (
            <Button onClick={() => onOpenProductPicker(wall.id)} disabled={formBusy} variant="outline" size="sm" className="h-8">
              <Plus className="mr-1 h-3 w-3" />Product
            </Button>
          )}
          <Button onClick={() => onDeleteWall(wall.id)} disabled={formBusy} variant="ghost" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600">
        Select the products and scope for this wall first. You'll set the final manual Supply & Install price in the review step after the associated cost is calculated.
      </div>

      <WallProductList
        formBusy={formBusy}
        products={wall.products}
        wallId={wall.id}
        onEditProduct={onEditProduct}
        onRemoveProduct={onRemoveProduct}
      />

      {wall.products.length === 0 && !isProductPickerOpen && (
        <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
          No products added yet. Use Product to add one to this wall.
        </div>
      )}

      {isProductPickerOpen && (
        <ProductPicker
          formBusy={formBusy}
          editingProductId={editingProductId}
          tempProductType={tempProductType}
          tempProductId={tempProductId}
          tempCustomItemType={tempCustomItemType}
          productsByType={productsByType}
          activeWallFloatingCabinet={activeWallFloatingCabinet}
          selectedBackdropDimensions={selectedBackdropDimensions}
          tempCabinetWidth={tempCabinetWidth}
          tempCabinetHeight={tempCabinetHeight}
          tempCabinetDepth={tempCabinetDepth}
          tempCabinetHeightFromFloor={tempCabinetHeightFromFloor}
          tempCabinetSectionWidths={tempCabinetSectionWidths}
          tempCabinetShelfHeightsBySection={tempCabinetShelfHeightsBySection}
          tempClientPreferenceNotes={tempClientPreferenceNotes}
          tempTvSizeInches={tempTvSizeInches}
          tempTvBottomAfflMm={tempTvBottomAfflMm}
          tempCabinetToTvGapMm={tempCabinetToTvGapMm}
          tempIncludeTvBracket={tempIncludeTvBracket}
          tempAcousticFixingMethod={tempAcousticFixingMethod}
          onProductTypeChange={onProductTypeChange}
          onProductIdChange={onProductIdChange}
          onCustomItemTypeChange={onCustomItemTypeChange}
          onSubmit={() => onSubmitProduct(wall.id)}
          onCancel={onCloseProductPicker}
          onTempCabinetWidthChange={onTempCabinetWidthChange}
          onTempCabinetHeightChange={onTempCabinetHeightChange}
          onTempCabinetDepthChange={onTempCabinetDepthChange}
          onTempCabinetHeightFromFloorChange={onTempCabinetHeightFromFloorChange}
          onTempCabinetSectionWidthsChange={onTempCabinetSectionWidthsChange}
          onTempCabinetShelfHeightsBySectionChange={onTempCabinetShelfHeightsBySectionChange}
          onTempClientPreferenceNotesChange={onTempClientPreferenceNotesChange}
          onTempTvSizeInchesChange={onTempTvSizeInchesChange}
          onTempTvBottomAfflMmChange={onTempTvBottomAfflMmChange}
          onTempCabinetToTvGapMmChange={onTempCabinetToTvGapMmChange}
          onTempIncludeTvBracketChange={onTempIncludeTvBracketChange}
          onTempAcousticFixingMethodChange={onTempAcousticFixingMethodChange}
        />
      )}
    </Card>
  );
}
