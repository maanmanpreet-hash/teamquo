import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CabinetFieldsProps {
  cabinetWidth: string;
  cabinetHeight: string;
  cabinetDepth: string;
  cabinetHeightFromFloor: string;
  cabinetSectionWidths: string;
  cabinetShelfHeightsBySection: string;
  clientPreferenceNotes: string;
  showClientPreferenceNotes: boolean;
  onCabinetWidthChange: (value: string) => void;
  onCabinetHeightChange: (value: string) => void;
  onCabinetDepthChange: (value: string) => void;
  onCabinetHeightFromFloorChange: (value: string) => void;
  onCabinetSectionWidthsChange: (value: string) => void;
  onCabinetShelfHeightsBySectionChange: (value: string) => void;
  onClientPreferenceNotesChange: (value: string) => void;
}

export function CabinetFields({
  cabinetWidth,
  cabinetHeight,
  cabinetDepth,
  cabinetHeightFromFloor,
  cabinetSectionWidths,
  cabinetShelfHeightsBySection,
  clientPreferenceNotes,
  showClientPreferenceNotes,
  onCabinetWidthChange,
  onCabinetHeightChange,
  onCabinetDepthChange,
  onCabinetHeightFromFloorChange,
  onCabinetSectionWidthsChange,
  onCabinetShelfHeightsBySectionChange,
  onClientPreferenceNotesChange,
}: CabinetFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-white p-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div>
          <Label htmlFor="customWidthMm">Width mm *</Label>
          <Input id="customWidthMm" type="number" value={cabinetWidth} onChange={e => onCabinetWidthChange(e.target.value)} placeholder="2100" className="mt-1 h-10" />
        </div>
        <div>
          <Label htmlFor="customHeightMm">Height mm *</Label>
          <Input id="customHeightMm" type="number" value={cabinetHeight} onChange={e => onCabinetHeightChange(e.target.value)} placeholder="450" className="mt-1 h-10" />
        </div>
        <div>
          <Label htmlFor="customDepthMm">Depth mm *</Label>
          <Input id="customDepthMm" type="number" value={cabinetDepth} onChange={e => onCabinetDepthChange(e.target.value)} placeholder="360" className="mt-1 h-10" />
        </div>
        <div>
          <Label htmlFor="customAfflMm">Bottom from floor mm</Label>
          <Input id="customAfflMm" type="number" value={cabinetHeightFromFloor} onChange={e => onCabinetHeightFromFloorChange(e.target.value)} placeholder="0" className="mt-1 h-10" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="cabinetSectionWidths">Section widths mm</Label>
          <Input
            id="cabinetSectionWidths"
            value={cabinetSectionWidths}
            onChange={e => onCabinetSectionWidthsChange(e.target.value)}
            placeholder="700, 700, 700"
            className="mt-1 h-10"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional. Comma-separated widths that add up to the overall cabinet width.
          </p>
        </div>
        <div>
          <Label htmlFor="cabinetShelfHeights">Shelf heights by section mm</Label>
          <Input
            id="cabinetShelfHeights"
            value={cabinetShelfHeightsBySection}
            onChange={e => onCabinetShelfHeightsBySectionChange(e.target.value)}
            placeholder="230 | 230, 460 |"
            className="mt-1 h-10"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional. Use `|` between sections and commas within each section.
          </p>
        </div>
      </div>
      {showClientPreferenceNotes && (
        <div>
          <Label htmlFor="floatingCabinetNotes">Client preference notes</Label>
          <textarea
            id="floatingCabinetNotes"
            value={clientPreferenceNotes}
            onChange={e => onClientPreferenceNotesChange(e.target.value)}
            placeholder="Optional finish, handle, profile, colour, or other client preference"
            className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
