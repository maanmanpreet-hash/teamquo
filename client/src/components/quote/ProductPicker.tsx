import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/quote/formatters";
import { productTypeLabels, usesCatalogProductSelection } from "@/lib/quote/productTypeHelpers";
import type {
  AcousticFixingMethod,
  CustomItemOption,
  ProductTypeSlug,
  WallProduct,
} from "@/lib/quote/types";
import { customItemOptions } from "@/lib/quote/types";
import { parseMaterialMetadata } from "@shared/quoteCalculations";

import { ProductEditorFields } from "./ProductEditorFields";

interface ProductPickerProps {
  formBusy: boolean;
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
  onProductTypeChange: (value: ProductTypeSlug) => void;
  onProductIdChange: (value: string) => void;
  onCustomItemTypeChange: (value: CustomItemOption) => void;
  onSubmit: () => void;
  onCancel: () => void;
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

export function ProductPicker({
  formBusy,
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
  onProductTypeChange,
  onProductIdChange,
  onCustomItemTypeChange,
  onSubmit,
  onCancel,
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
}: ProductPickerProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-blue-50/40 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label>Product Type *</Label>
          <Select
            value={tempProductType || ""}
            onValueChange={value => onProductTypeChange(value as ProductTypeSlug)}
          >
            <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(productTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {tempProductType && usesCatalogProductSelection(tempProductType) && (
          <div>
            <Label>{tempProductType === "tv_backdrop" ? "Marble Sheet Variant *" : "Product *"}</Label>
            <Select value={tempProductId} onValueChange={onProductIdChange}>
              <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {productsByType?.map(product => {
                  const metadata = parseMaterialMetadata(product.description);
                  return (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} - {formatMoney(product.pricePerUnit)}{metadata.wastagePercent !== undefined ? ` - ${metadata.wastagePercent}% wastage` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
        {tempProductType === "custom_item" && (
          <div>
            <Label>Custom Item *</Label>
            <Select value={tempCustomItemType} onValueChange={value => onCustomItemTypeChange(value as CustomItemOption)}>
              <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select custom item" /></SelectTrigger>
              <SelectContent>
                {customItemOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Button onClick={onSubmit} disabled={formBusy} className="h-10 w-full flex-1">
            {editingProductId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {editingProductId ? "Save" : "Add"}
          </Button>
          <Button onClick={onCancel} disabled={formBusy} type="button" variant="outline" className="h-10 w-full sm:w-auto">Cancel</Button>
        </div>
      </div>

      <ProductEditorFields
        tempProductType={tempProductType}
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
    </div>
  );
}
