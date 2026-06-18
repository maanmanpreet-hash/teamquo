import type { ChangeEventHandler } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReferenceImageFieldProps {
  formBusy: boolean;
  isUploadingImage: boolean;
  referenceImagePreview: string | null;
  onUpload: ChangeEventHandler<HTMLInputElement>;
  onClear: () => void;
}

export function ReferenceImageField({
  formBusy,
  isUploadingImage,
  referenceImagePreview,
  onUpload,
  onClear,
}: ReferenceImageFieldProps) {
  return (
    <div className="border-t pt-3">
      <Label>Reference Image</Label>
      <Input type="file" accept="image/*" onChange={onUpload} disabled={isUploadingImage} className="mt-1 h-10" />
      {referenceImagePreview && (
        <div className="relative mt-2 inline-block">
          <img src={referenceImagePreview} alt="Reference" className="max-h-32 rounded border-2 border-gray-200" />
          <button
            type="button"
            disabled={formBusy}
            onClick={onClear}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}
