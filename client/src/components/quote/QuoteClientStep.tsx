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

import { ReferenceImageField } from "./ReferenceImageField";

interface QuoteClientStepProps {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  suburb: string;
  clientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  referenceImagePreview: string | null;
  hasClientDetails: boolean;
  formBusy: boolean;
  isUploadingImage: boolean;
  onClientNameChange: (value: string) => void;
  onClientPhoneChange: (value: string) => void;
  onClientAddressChange: (value: string) => void;
  onSuburbChange: (value: string) => void;
  onClientEmailChange: (value: string) => void;
  onAppointmentDateChange: (value: string) => void;
  onAppointmentTimeChange: (value: string) => void;
  onImageUpload: React.ChangeEventHandler<HTMLInputElement>;
  onClearReferenceImage: () => void;
  onContinue: () => void;
}

export function QuoteClientStep({
  clientName,
  clientPhone,
  clientAddress,
  suburb,
  clientEmail,
  appointmentDate,
  appointmentTime,
  referenceImagePreview,
  hasClientDetails,
  formBusy,
  isUploadingImage,
  onClientNameChange,
  onClientPhoneChange,
  onClientAddressChange,
  onSuburbChange,
  onClientEmailChange,
  onAppointmentDateChange,
  onAppointmentTimeChange,
  onImageUpload,
  onClearReferenceImage,
  onContinue,
}: QuoteClientStepProps) {
  return (
    <Card className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="clientName">Client Name</Label>
          <Input id="clientName" value={clientName} onChange={e => onClientNameChange(e.target.value)} placeholder="John Smith" className="mt-1 h-10" />
        </div>
        <div>
          <Label htmlFor="clientPhone">Phone</Label>
          <Input id="clientPhone" value={clientPhone} onChange={e => onClientPhoneChange(e.target.value)} placeholder="0412 345 678" className="mt-1 h-10" />
        </div>
        <div>
          <Label htmlFor="clientAddress">Address</Label>
          <Input id="clientAddress" value={clientAddress} onChange={e => onClientAddressChange(e.target.value)} placeholder="123 Main St" className="mt-1 h-10" />
        </div>
        <div>
          <Label htmlFor="suburb">Suburb</Label>
          <Select value={suburb} onValueChange={onSuburbChange}>
            <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select suburb" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Kalkallo">Kalkallo</SelectItem>
              <SelectItem value="Donnybrook">Donnybrook</SelectItem>
              <SelectItem value="Mickleham">Mickleham</SelectItem>
              <SelectItem value="Craigieburn">Craigieburn</SelectItem>
              <SelectItem value="Beveridge">Beveridge</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="clientEmail">Email</Label>
          <Input id="clientEmail" type="email" value={clientEmail} onChange={e => onClientEmailChange(e.target.value)} placeholder="john@example.com" className="mt-1 h-10" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="appointmentDate">Date</Label>
            <Input id="appointmentDate" type="date" value={appointmentDate} onChange={e => onAppointmentDateChange(e.target.value)} className="mt-1 h-10" />
          </div>
          <div>
            <Label htmlFor="appointmentTime">Time</Label>
            <Select value={appointmentTime} onValueChange={onAppointmentTimeChange}>
              <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Time" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 48 }).map((_, i) => {
                  const hour = Math.floor(i / 2);
                  const minute = (i % 2) * 30;
                  const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                  return <SelectItem key={time} value={time}>{time}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ReferenceImageField
        formBusy={formBusy}
        isUploadingImage={isUploadingImage}
        referenceImagePreview={referenceImagePreview}
        onUpload={onImageUpload}
        onClear={onClearReferenceImage}
      />

      <Button onClick={onContinue} disabled={!hasClientDetails || formBusy} className="h-10 w-full">
        Continue
      </Button>
    </Card>
  );
}
