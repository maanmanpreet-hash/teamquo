import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TvBackdropFieldsProps {
  activeWallHasFloatingCabinet: boolean;
  tvSizeInches: string;
  tvBottomAfflMm: string;
  cabinetToTvGapMm: string;
  includeTvBracket: boolean;
  selectedBackdropDimensions?: {
    backdropWidthMm: number;
    backdropHeightMm: number;
  };
  onTvSizeInchesChange: (value: string) => void;
  onTvBottomAfflChange: (value: string) => void;
  onCabinetToTvGapChange: (value: string) => void;
  onIncludeTvBracketChange: (checked: boolean) => void;
}

export function TvBackdropFields({
  activeWallHasFloatingCabinet,
  tvSizeInches,
  tvBottomAfflMm,
  cabinetToTvGapMm,
  includeTvBracket,
  selectedBackdropDimensions,
  onTvSizeInchesChange,
  onTvBottomAfflChange,
  onCabinetToTvGapChange,
  onIncludeTvBracketChange,
}: TvBackdropFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-white p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>TV Size inches *</Label>
          <Input
            type="number"
            value={tvSizeInches}
            onChange={e => onTvSizeInchesChange(e.target.value)}
            placeholder="75"
            className="mt-1 h-10"
          />
        </div>
        {!activeWallHasFloatingCabinet && (
          <div>
            <Label>TV Bottom AFFL mm</Label>
            <Input
              type="number"
              value={tvBottomAfflMm}
              onChange={e => onTvBottomAfflChange(e.target.value)}
              placeholder="Optional override"
              className="mt-1 h-10"
            />
          </div>
        )}
      </div>
      {selectedBackdropDimensions && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Applied Sheet Width mm</Label>
            <Input
              value={String(selectedBackdropDimensions.backdropWidthMm)}
              readOnly
              className="mt-1 h-10 bg-gray-50"
            />
          </div>
          <div>
            <Label>Applied Sheet Height mm</Label>
            <Input
              value={String(selectedBackdropDimensions.backdropHeightMm)}
              readOnly
              className="mt-1 h-10 bg-gray-50"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>Cabinet to TV Gap mm</Label>
          <Input
            type="number"
            value={cabinetToTvGapMm}
            onChange={e => onCabinetToTvGapChange(e.target.value)}
            placeholder="250"
            className="mt-1 h-10"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={includeTvBracket}
          onChange={event => onIncludeTvBracketChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        TV Bracket
      </label>
    </div>
  );
}
