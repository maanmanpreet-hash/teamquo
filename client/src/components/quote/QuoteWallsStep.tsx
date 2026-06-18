import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AcousticFixingMethod,
  CustomItemOption,
  ProductTypeSlug,
  WallProduct,
  WallWithProducts,
} from "@/lib/quote/types";

import { WallCard } from "./WallCard";

interface QuoteWallsStepProps {
  tempWallType: "regular" | "garage" | "custom";
  tempWallName: string;
  tempWallWidth: string;
  tempWallHeight: string;
  formBusy: boolean;
  wallsWithProducts: WallWithProducts[];
  activeProductWallId: string | null;
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
  reviewReady: boolean;
  onTempWallTypeChange: (value: "regular" | "garage" | "custom") => void;
  onTempWallNameChange: (value: string) => void;
  onTempWallWidthChange: (value: string) => void;
  onTempWallHeightChange: (value: string) => void;
  onAddWall: () => void;
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
  onReview: () => void;
}

export function QuoteWallsStep({
  tempWallType,
  tempWallName,
  tempWallWidth,
  tempWallHeight,
  formBusy,
  wallsWithProducts,
  activeProductWallId,
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
  reviewReady,
  onTempWallTypeChange,
  onTempWallNameChange,
  onTempWallWidthChange,
  onTempWallHeightChange,
  onAddWall,
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
  onReview,
}: QuoteWallsStepProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Add Wall</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <Label>Type</Label>
            <Select value={tempWallType} onValueChange={value => onTempWallTypeChange(value as "regular" | "garage" | "custom")}>
              <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">TV Wall</SelectItem>
                <SelectItem value="regular">Hallway Wall</SelectItem>
                <SelectItem value="garage">Garage Wall</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="wallName">Wall Name *</Label>
            <Input id="wallName" value={tempWallName} onChange={e => onTempWallNameChange(e.target.value)} placeholder="Living Room" className="mt-1 h-10" />
          </div>
          <div>
            <Label htmlFor="wallWidth">Width mm *</Label>
            <Input
              id="wallWidth"
              type="text"
              inputMode="decimal"
              value={tempWallWidth}
              onChange={e => onTempWallWidthChange(e.target.value)}
              placeholder="3800"
              className="mt-1 h-10"
            />
          </div>
          <div>
            <Label htmlFor="wallHeight">Height mm *</Label>
            <Input
              id="wallHeight"
              type="text"
              inputMode="decimal"
              value={tempWallHeight}
              onChange={e => onTempWallHeightChange(e.target.value)}
              placeholder="2600"
              className="mt-1 h-10"
            />
          </div>
        </div>
        <Button onClick={onAddWall} disabled={formBusy} className="h-10 w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Add Wall</Button>
      </Card>

      {wallsWithProducts.map(wall => (
        <WallCard
          key={wall.id}
          wall={wall}
          formBusy={formBusy}
          isProductPickerOpen={activeProductWallId === wall.id}
          editingProductId={editingProductId}
          tempProductType={tempProductType}
          tempProductId={tempProductId}
          tempCustomItemType={tempCustomItemType}
          productsByType={productsByType}
          activeWallFloatingCabinet={activeProductWallId === wall.id ? activeWallFloatingCabinet : undefined}
          selectedBackdropDimensions={activeProductWallId === wall.id ? selectedBackdropDimensions : undefined}
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
          onOpenProductPicker={onOpenProductPicker}
          onDeleteWall={onDeleteWall}
          onEditProduct={onEditProduct}
          onRemoveProduct={onRemoveProduct}
          onProductTypeChange={onProductTypeChange}
          onProductIdChange={onProductIdChange}
          onCustomItemTypeChange={onCustomItemTypeChange}
          onSubmitProduct={onSubmitProduct}
          onCloseProductPicker={onCloseProductPicker}
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
      ))}

      <Button onClick={onReview} disabled={!reviewReady || formBusy} className="h-10 w-full">Review Quote</Button>
    </div>
  );
}
