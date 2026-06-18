import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AcousticFixingMethod } from "@/lib/quote/types";

interface AcousticPanelFieldsProps {
  value: AcousticFixingMethod;
  onChange: (value: AcousticFixingMethod) => void;
}

export function AcousticPanelFields({ value, onChange }: AcousticPanelFieldsProps) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <Label>Fixing Method</Label>
      <Select value={value} onValueChange={nextValue => onChange(nextValue as AcousticFixingMethod)}>
        <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="screws">Screws</SelectItem>
          <SelectItem value="glue">Glue</SelectItem>
          <SelectItem value="screws_and_glue">Screws + Glue</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
