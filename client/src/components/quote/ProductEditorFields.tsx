import { AcousticPanelFields } from "./AcousticPanelFields";
import { CabinetFields } from "./CabinetFields";
import { TvBackdropFields } from "./TvBackdropFields";
import type { AcousticFixingMethod, ProductTypeSlug, WallProduct } from "@/lib/quote/types";

interface ProductEditorFieldsProps {
  tempProductType: ProductTypeSlug | null;
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

export function ProductEditorFields({
  tempProductType,
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
}: ProductEditorFieldsProps) {
  return (
    <>
      {["floating_cabinet", "side_tower", "shelving"].includes(tempProductType || "") && (
        <CabinetFields
          cabinetWidth={tempCabinetWidth}
          cabinetHeight={tempCabinetHeight}
          cabinetDepth={tempCabinetDepth}
          cabinetHeightFromFloor={tempCabinetHeightFromFloor}
          cabinetSectionWidths={tempCabinetSectionWidths}
          cabinetShelfHeightsBySection={tempCabinetShelfHeightsBySection}
          clientPreferenceNotes={tempClientPreferenceNotes}
          showClientPreferenceNotes={tempProductType === "floating_cabinet"}
          onCabinetWidthChange={onTempCabinetWidthChange}
          onCabinetHeightChange={onTempCabinetHeightChange}
          onCabinetDepthChange={onTempCabinetDepthChange}
          onCabinetHeightFromFloorChange={onTempCabinetHeightFromFloorChange}
          onCabinetSectionWidthsChange={onTempCabinetSectionWidthsChange}
          onCabinetShelfHeightsBySectionChange={onTempCabinetShelfHeightsBySectionChange}
          onClientPreferenceNotesChange={onTempClientPreferenceNotesChange}
        />
      )}

      {tempProductType === "tv_backdrop" && (
        <TvBackdropFields
          activeWallHasFloatingCabinet={Boolean(activeWallFloatingCabinet)}
          tvSizeInches={tempTvSizeInches}
          tvBottomAfflMm={tempTvBottomAfflMm}
          cabinetToTvGapMm={tempCabinetToTvGapMm}
          includeTvBracket={tempIncludeTvBracket}
          selectedBackdropDimensions={selectedBackdropDimensions}
          onTvSizeInchesChange={onTempTvSizeInchesChange}
          onTvBottomAfflChange={onTempTvBottomAfflMmChange}
          onCabinetToTvGapChange={onTempCabinetToTvGapMmChange}
          onIncludeTvBracketChange={onTempIncludeTvBracketChange}
        />
      )}

      {tempProductType === "acoustic_panel" && (
        <AcousticPanelFields
          value={tempAcousticFixingMethod}
          onChange={onTempAcousticFixingMethodChange}
        />
      )}
    </>
  );
}
