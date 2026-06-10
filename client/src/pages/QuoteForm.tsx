"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Loader2,
  Plus,
  Ruler,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  calculatePanelRequirement,
  parseMaterialMetadata,
  type ObstructionStatus,
  type PanelCalculationResult,
} from "@shared/quoteCalculations";

type WorkflowStep = "client" | "walls" | "review";

type ProductTypeSlug =
  | "cladding"
  | "acoustic_panel"
  | "floating_cabinet"
  | "fireplace"
  | "mirror"
  | "marble_sheet";

interface WallWithProducts {
  id: string;
  wallType: "regular" | "garage" | "custom";
  wallName: string;
  wallWidthMm: number;
  wallHeightMm: number;
  obstructionStatus: ObstructionStatus;
  obstructionNotes: string;
  products: WallProduct[];
}

interface WallProduct {
  id: string;
  productType: ProductTypeSlug;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  panelWidthMm?: number;
  panelHeightMm?: number;
  panelCalculation?: PanelCalculationResult;
  manualReviewRequired?: boolean;
  reviewReasons?: string[];
  internalNotes?: string[];
  customerNotes?: string[];
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetDepthMm?: number;
  cabinetHeightFromFloorMm?: number;
}

const workflowSteps: Array<{ id: WorkflowStep; title: string; icon: typeof ClipboardList }> = [
  { id: "client", title: "Client", icon: ClipboardList },
  { id: "walls", title: "Walls", icon: Ruler },
  { id: "review", title: "Review", icon: Save },
];

const productTypeSlugAliases: Record<ProductTypeSlug, string[]> = {
  cladding: ["cladding"],
  acoustic_panel: ["acoustic_panel", "acoustic-panels"],
  floating_cabinet: ["floating_cabinet", "floating-cabinet", "floating-cabinets"],
  fireplace: ["fireplace"],
  mirror: ["mirror", "mirrors"],
  marble_sheet: ["marble_sheet", "marble-sheet"],
};

const productTypeLabels: Record<ProductTypeSlug, string> = {
  cladding: "Cladding",
  acoustic_panel: "Acoustic Panel",
  floating_cabinet: "Floating Cabinet",
  fireplace: "Fireplace",
  mirror: "Mirror",
  marble_sheet: "Marble Sheet",
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatMetres(mm: number) {
  return `${(mm / 1000).toFixed(2)}m`;
}

function panelTypes(productType: ProductTypeSlug) {
  return ["cladding", "acoustic_panel", "marble_sheet"].includes(productType);
}

function encodeWallNotes(status: ObstructionStatus, notes: string) {
  return JSON.stringify({ obstructionStatus: status, obstructionNotes: notes });
}

function decodeWallNotes(notes: unknown): {
  obstructionStatus: ObstructionStatus;
  obstructionNotes: string;
} {
  if (typeof notes !== "string" || !notes.trim()) {
    return { obstructionStatus: "none", obstructionNotes: "" };
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && ["unknown", "none", "present"].includes(parsed.obstructionStatus)) {
      return {
        obstructionStatus: parsed.obstructionStatus,
        obstructionNotes: String(parsed.obstructionNotes || ""),
      };
    }
  } catch {
    return { obstructionStatus: "unknown", obstructionNotes: notes };
  }

  return { obstructionStatus: "unknown", obstructionNotes: notes };
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function QuoteForm() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("client");
  const [resumeJobId, setResumeJobId] = useState<number | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [wallsWithProducts, setWallsWithProducts] = useState<WallWithProducts[]>([]);
  const [tempWallType, setTempWallType] = useState<"regular" | "garage" | "custom">("custom");
  const [tempWallName, setTempWallName] = useState("");
  const [tempWallWidth, setTempWallWidth] = useState("");
  const [tempWallHeight, setTempWallHeight] = useState("");

  const [activeProductWallId, setActiveProductWallId] = useState<string | null>(null);
  const [tempProductType, setTempProductType] = useState<ProductTypeSlug | null>(null);
  const [tempProductId, setTempProductId] = useState("");
  const [tempCabinetWidth, setTempCabinetWidth] = useState("");
  const [tempCabinetHeight, setTempCabinetHeight] = useState("");
  const [tempCabinetDepth, setTempCabinetDepth] = useState("");
  const [tempCabinetHeightFromFloor, setTempCabinetHeightFromFloor] = useState("");

  const { data: productTypes } = trpc.products.listTypes.useQuery();
  const selectedProductTypeId = tempProductType
    ? productTypes?.find(type => productTypeSlugAliases[tempProductType].includes(type.slug))?.id || 0
    : 0;
  const { data: productsByType } = trpc.products.listByType.useQuery(
    { productTypeId: selectedProductTypeId },
    { enabled: selectedProductTypeId > 0 }
  );
  const { data: operators } = trpc.operators.list.useQuery();
  const { data: draftJob } = trpc.jobs.getById.useQuery(
    { id: resumeJobId || 0 },
    { enabled: resumeJobId !== null }
  );
  const { data: savedWalls } = trpc.walls.getByJobId.useQuery(
    { jobId: resumeJobId || 0 },
    { enabled: resumeJobId !== null }
  );

  const createJobMutation = trpc.jobs.create.useMutation();
  const updateJobMutation = trpc.jobs.update.useMutation();
  const createJobItemMutation = trpc.jobItems.create.useMutation();
  const uploadImageMutation = trpc.storage.uploadImage.useMutation();
  const createWallMutation = trpc.walls.create.useMutation();
  const deleteJobItemsByJobIdMutation = trpc.jobItems.deleteByJobId.useMutation();
  const deleteWallsByJobIdMutation = trpc.walls.deleteByJobId.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("resumeJobId");
    if (jobId) {
      setResumeJobId(parseInt(jobId, 10));
      setIsLoadingDraft(true);
    }
  }, []);

  useEffect(() => {
    if (draftJob && isLoadingDraft) {
      setClientName(draftJob.clientName === "[Draft]" ? "" : draftJob.clientName);
      setClientEmail(draftJob.clientEmail || "");
      setClientPhone(draftJob.clientPhone || "");
      setClientAddress(draftJob.clientAddress || "");
      setSuburb(draftJob.suburb || "");
      if (draftJob.appointmentDate) {
        const date = new Date(draftJob.appointmentDate);
        setAppointmentDate(date.toISOString().split("T")[0]);
      }
      setAppointmentTime(draftJob.appointmentTime || "");
      if (draftJob.referenceImageUrl) {
        setReferenceImageUrl(draftJob.referenceImageUrl);
        setReferenceImagePreview(draftJob.referenceImageUrl);
      }
      setIsLoadingDraft(false);
    }
  }, [draftJob, isLoadingDraft]);

  useEffect(() => {
    if (savedWalls && savedWalls.length > 0) {
      const wallsData = savedWalls.map((wall: any) => {
        const decodedNotes = decodeWallNotes(wall.notes);
        return {
          id: wall.id.toString(),
          wallType: wall.wallType,
          wallName: wall.wallName || "Wall",
          wallWidthMm: wall.wallWidthMm || 0,
          wallHeightMm: wall.wallHeightMm || 0,
          obstructionStatus: decodedNotes.obstructionStatus,
          obstructionNotes: decodedNotes.obstructionNotes,
          products: (wall.products || []).map((item: any) => {
            const productType = item.itemType as ProductTypeSlug;
            const panelCalculation = panelTypes(productType)
              ? calculatePanelRequirement({
                  wallWidthMm: wall.wallWidthMm || 0,
                  wallHeightMm: wall.wallHeightMm || 0,
                  panelWidthMm: item.productWidthMm || 0,
                  panelHeightMm: item.productHeightMm || 0,
                  productName: item.productName || item.productDesign || item.itemType,
                  obstructionStatus: decodedNotes.obstructionStatus,
                  obstructionNotes: decodedNotes.obstructionNotes,
                })
              : undefined;

            return {
              id: item.id.toString(),
              productType,
              productId: String(item.productId || item.claddingVariantId || ""),
              productName: item.productName || item.productDesign || item.itemType,
              quantity: item.quantityRequired || panelCalculation?.finalQuantity || 1,
              unitPrice: item.unitPrice || 0,
              panelWidthMm: item.productWidthMm,
              panelHeightMm: item.productHeightMm,
              panelCalculation,
              manualReviewRequired: panelCalculation?.manualReviewRequired,
              reviewReasons: panelCalculation?.reviewReasons,
              internalNotes: panelCalculation?.internalNotes,
              customerNotes: panelCalculation?.customerNotes,
              cabinetWidthMm: item.cabinetWidthMm,
              cabinetHeightMm: item.cabinetHeightMm,
              cabinetDepthMm: item.cabinetDepthMm,
              cabinetHeightFromFloorMm: item.cabinetHeightFromFloorMm,
            };
          }),
        };
      });
      setWallsWithProducts(wallsData);
    }
  }, [savedWalls]);

  const getSelectedOperatorName = () => {
    const selectedOperator = localStorage.getItem("selectedOperator");
    if (!selectedOperator) return undefined;
    return operators?.find(operator => operator.id.toString() === selectedOperator)?.name || selectedOperator;
  };

  const calculateTotal = () =>
    wallsWithProducts.reduce(
      (total, wall) =>
        total + wall.products.reduce((wallTotal, product) => wallTotal + product.quantity * product.unitPrice, 0),
      0
    );

  const manualReviewItems = useMemo(
    () =>
      wallsWithProducts.flatMap(wall =>
        wall.products.filter(product => product.manualReviewRequired).map(product => ({ wall, product }))
      ),
    [wallsWithProducts]
  );

  const hasClientDetails = clientName.trim().length > 0;
  const hasWalls = wallsWithProducts.length > 0;
  const hasProducts = wallsWithProducts.some(wall => wall.products.length > 0);
  const wallsWithoutProducts = wallsWithProducts.filter(wall => wall.products.length === 0);
  const workflowReady = hasClientDetails && hasWalls && hasProducts && wallsWithoutProducts.length === 0;
  const saveInProgress = createJobMutation.isPending || updateJobMutation.isPending;

  const resetProductDraft = () => {
    setTempProductType(null);
    setTempProductId("");
    setTempCabinetWidth("");
    setTempCabinetHeight("");
    setTempCabinetDepth("");
    setTempCabinetHeightFromFloor("");
  };

  const openProductPicker = (wallId: string) => {
    resetProductDraft();
    setActiveProductWallId(wallId);
  };

  const closeProductPicker = () => {
    resetProductDraft();
    setActiveProductWallId(null);
  };

  const goToStep = (step: WorkflowStep) => {
    if (step === "walls" && !hasClientDetails) {
      toast.error("Enter the client name before adding walls");
      setCurrentStep("client");
      return;
    }
    if (step === "review" && !workflowReady) {
      toast.error("Add client, wall dimensions, and products before review");
      setCurrentStep(!hasClientDetails ? "client" : "walls");
      return;
    }
    setCurrentStep(step);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    setIsUploadingImage(true);
    try {
      const base64Data = await fileToBase64(file);
      const uploaded = await uploadImageMutation.mutateAsync({
        fileName: file.name,
        base64Data,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      });
      setReferenceImageUrl(uploaded.url);
      setReferenceImagePreview(uploaded.url);
      toast.success("Reference image uploaded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddWall = () => {
    if (!tempWallName || !tempWallWidth || !tempWallHeight) {
      toast.error("Wall name, width, and height are required");
      return;
    }

    const wallWidthMm = Math.round(Number(tempWallWidth) * 1000);
    const wallHeightMm = Math.round(Number(tempWallHeight) * 1000);
    if (!Number.isFinite(wallWidthMm) || !Number.isFinite(wallHeightMm) || wallWidthMm <= 0 || wallHeightMm <= 0) {
      toast.error("Wall dimensions must be valid positive numbers");
      return;
    }

    setWallsWithProducts([
      ...wallsWithProducts,
      {
        id: Date.now().toString(),
        wallType: tempWallType,
        wallName: tempWallName,
        wallWidthMm,
        wallHeightMm,
        obstructionStatus: "none",
        obstructionNotes: "",
        products: [],
      },
    ]);
    setTempWallType("custom");
    setTempWallName("");
    setTempWallWidth("");
    setTempWallHeight("");
    toast.success("Wall added");
  };

  const handleAddProductToWall = (wallId: string) => {
    if (!tempProductType || !tempProductId) {
      toast.error("Please select a product");
      return;
    }

    const wall = wallsWithProducts.find(w => w.id === wallId);
    if (!wall) return;

    const foundProduct = productsByType?.find(product => product.id.toString() === tempProductId);
    if (!foundProduct) {
      toast.error("Product not found");
      return;
    }

    let newProduct: WallProduct = {
      id: Date.now().toString(),
      productType: tempProductType,
      productId: tempProductId,
      productName: foundProduct.name,
      quantity: 1,
      unitPrice: foundProduct.pricePerUnit,
    };

    if (panelTypes(tempProductType)) {
      const metadata = parseMaterialMetadata(foundProduct.description);
      const panelCalculation = calculatePanelRequirement({
        wallWidthMm: wall.wallWidthMm,
        wallHeightMm: wall.wallHeightMm,
        panelWidthMm: foundProduct.widthMm || 0,
        panelHeightMm: foundProduct.heightMm || 0,
        productName: foundProduct.name,
        obstructionStatus: wall.obstructionStatus,
        obstructionNotes: wall.obstructionNotes,
        wastagePercent: metadata.wastagePercent,
        orientationRule: metadata.orientationRule,
      });

      newProduct = {
        ...newProduct,
        quantity: panelCalculation.finalQuantity,
        panelWidthMm: foundProduct.widthMm,
        panelHeightMm: foundProduct.heightMm,
        panelCalculation,
        manualReviewRequired: panelCalculation.manualReviewRequired,
        reviewReasons: panelCalculation.reviewReasons,
        internalNotes: panelCalculation.internalNotes,
        customerNotes: panelCalculation.customerNotes,
      };
    }

    if (tempProductType === "floating_cabinet") {
      const cabinetWidthMm = Number(tempCabinetWidth);
      const cabinetHeightMm = Number(tempCabinetHeight);
      const cabinetDepthMm = Number(tempCabinetDepth);
      const cabinetHeightFromFloorMm = Number(tempCabinetHeightFromFloor);
      if ([cabinetWidthMm, cabinetHeightMm, cabinetDepthMm, cabinetHeightFromFloorMm].some(value => !Number.isFinite(value) || value <= 0)) {
        toast.error("Enter valid cabinet dimensions before adding floating cabinet");
        return;
      }
      newProduct = {
        ...newProduct,
        cabinetWidthMm,
        cabinetHeightMm,
        cabinetDepthMm,
        cabinetHeightFromFloorMm,
      };
    }

    setWallsWithProducts(
      wallsWithProducts.map(currentWall =>
        currentWall.id === wallId ? { ...currentWall, products: [...currentWall.products, newProduct] } : currentWall
      )
    );
    closeProductPicker();
    toast.success("Product added");
  };

  const handleDeleteWall = (wallId: string) => {
    if (activeProductWallId === wallId) closeProductPicker();
    setWallsWithProducts(wallsWithProducts.filter(wall => wall.id !== wallId));
  };

  const handleRemoveProduct = (wallId: string, productId: string) => {
    setWallsWithProducts(
      wallsWithProducts.map(wall =>
        wall.id === wallId ? { ...wall, products: wall.products.filter(product => product.id !== productId) } : wall
      )
    );
  };

  const handleSaveDraft = async (requireComplete = false) => {
    if (!hasClientDetails) {
      toast.error("Client name is required before saving");
      setCurrentStep("client");
      return;
    }
    if (requireComplete && !workflowReady) {
      toast.error("Complete wall dimensions and products before saving the quote");
      setCurrentStep("walls");
      return;
    }

    try {
      const jobInput = {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        clientAddress: clientAddress.trim() || undefined,
        suburb: suburb || undefined,
        appointmentDate: appointmentDate || undefined,
        appointmentTime: appointmentTime || undefined,
        referenceImageUrl: referenceImageUrl || undefined,
        operatorName: getSelectedOperatorName(),
        totalEstimate: calculateTotal(),
      };

      const savedJob = resumeJobId
        ? await updateJobMutation.mutateAsync({ id: resumeJobId, ...jobInput })
        : await createJobMutation.mutateAsync(jobInput);

      const jobId = savedJob?.id || resumeJobId;
      if (!jobId) throw new Error("Quote could not be saved");

      await deleteJobItemsByJobIdMutation.mutateAsync({ jobId });
      await deleteWallsByJobIdMutation.mutateAsync({ jobId });

      for (const wall of wallsWithProducts) {
        const savedWall = await createWallMutation.mutateAsync({
          jobId,
          wallType: wall.wallType,
          wallName: wall.wallName,
          wallWidthMm: wall.wallWidthMm,
          wallHeightMm: wall.wallHeightMm,
          notes: encodeWallNotes(wall.obstructionStatus, wall.obstructionNotes),
        });

        for (const product of wall.products) {
          await createJobItemMutation.mutateAsync({
            jobId,
            wallId: savedWall.id,
            itemType: product.productType,
            productId: product.productId ? Number(product.productId) : undefined,
            wallWidthMm: wall.wallWidthMm,
            wallHeightMm: wall.wallHeightMm,
            cabinetWidthMm: product.cabinetWidthMm,
            cabinetHeightMm: product.cabinetHeightMm,
            cabinetDepthMm: product.cabinetDepthMm,
            cabinetHeightFromFloorMm: product.cabinetHeightFromFloorMm,
            quantityRequired: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.quantity * product.unitPrice,
          });
        }
      }

      setResumeJobId(jobId);
      toast.success(requireComplete ? "Quote saved" : "Draft saved");
      if (requireComplete) navigate("/jobs");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save quote");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/jobs")} variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quote</h1>
              <p className="text-xs text-gray-600">Client → Walls → Review</p>
            </div>
          </div>
          <Button onClick={() => handleSaveDraft(false)} variant="outline" disabled={saveInProgress || !hasClientDetails} className="h-9">
            {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Draft
          </Button>
        </div>

        <Card className="p-2">
          <div className="grid grid-cols-3 gap-2">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const active = currentStep === step.id;
              const complete = step.id === "client" ? hasClientDetails : step.id === "walls" ? hasWalls && hasProducts : workflowReady;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`rounded-md border px-2 py-2 text-left text-sm transition ${
                    active ? "border-blue-500 bg-blue-50" : complete ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {complete ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : <Icon className="h-4 w-4 text-blue-700" />}
                    <span className="font-semibold">{index + 1}. {step.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {manualReviewItems.length > 0 && currentStep === "review" && (
          <Card className="border-amber-300 bg-amber-50 p-3">
            <div className="flex gap-2 text-sm text-amber-900">
              <FileWarning className="mt-0.5 h-4 w-4 text-amber-700" />
              <p><strong>Manual review required.</strong> Check flagged quantities before relying on the quote.</p>
            </div>
          </Card>
        )}

        {currentStep === "client" && (
          <Card className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" className="mt-1 h-10" />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone</Label>
                <Input id="clientPhone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="0412 345 678" className="mt-1 h-10" />
              </div>
              <div>
                <Label htmlFor="clientAddress">Address</Label>
                <Input id="clientAddress" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St" className="mt-1 h-10" />
              </div>
              <div>
                <Label htmlFor="suburb">Suburb</Label>
                <Select value={suburb} onValueChange={setSuburb}>
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
                <Input id="clientEmail" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="john@example.com" className="mt-1 h-10" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="appointmentDate">Date</Label>
                  <Input id="appointmentDate" type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className="mt-1 h-10" />
                </div>
                <div>
                  <Label htmlFor="appointmentTime">Time</Label>
                  <Select value={appointmentTime} onValueChange={setAppointmentTime}>
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

            <div className="border-t pt-3">
              <Label>Reference Image</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} className="mt-1 h-10" />
              {referenceImagePreview && (
                <div className="relative mt-2 inline-block">
                  <img src={referenceImagePreview} alt="Reference" className="max-h-32 rounded border-2 border-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceImageUrl("");
                      setReferenceImagePreview(null);
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    x
                  </button>
                </div>
              )}
            </div>

            <Button onClick={() => goToStep("walls")} disabled={!hasClientDetails} className="h-10 w-full">
              Continue
            </Button>
          </Card>
        )}

        {currentStep === "walls" && (
          <div className="space-y-4">
            <Card className="space-y-3 p-4">
              <h2 className="text-base font-semibold">Add Wall</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div>
                  <Label>Type</Label>
                  <Select value={tempWallType} onValueChange={value => setTempWallType(value as "regular" | "garage" | "custom")}>
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
                  <Input id="wallName" value={tempWallName} onChange={e => setTempWallName(e.target.value)} placeholder="Living Room" className="mt-1 h-10" />
                </div>
                <div>
                  <Label htmlFor="wallWidth">Width m *</Label>
                  <Input id="wallWidth" type="number" step="0.01" value={tempWallWidth} onChange={e => setTempWallWidth(e.target.value)} placeholder="3.80" className="mt-1 h-10" />
                </div>
                <div>
                  <Label htmlFor="wallHeight">Height m *</Label>
                  <Input id="wallHeight" type="number" step="0.01" value={tempWallHeight} onChange={e => setTempWallHeight(e.target.value)} placeholder="2.60" className="mt-1 h-10" />
                </div>
              </div>
              <Button onClick={handleAddWall} className="h-10 w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Add Wall</Button>
            </Card>

            {wallsWithProducts.map(wall => {
              const isProductPickerOpen = activeProductWallId === wall.id;

              return (
                <Card key={wall.id} className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{wall.wallName}</h3>
                      <p className="text-sm text-gray-600">{formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isProductPickerOpen && (
                        <Button onClick={() => openProductPicker(wall.id)} variant="outline" size="sm" className="h-8">
                          <Plus className="mr-1 h-3 w-3" />Product
                        </Button>
                      )}
                      <Button onClick={() => handleDeleteWall(wall.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {wall.products.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      {wall.products.map(product => (
                        <div key={product.id} className="rounded-lg bg-gray-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-gray-600">Qty {product.quantity} x {formatMoney(product.unitPrice)} = {formatMoney(product.quantity * product.unitPrice)}</p>
                              {product.manualReviewRequired && <p className="text-xs font-semibold text-amber-700">Manual review required</p>}
                            </div>
                            <Button onClick={() => handleRemoveProduct(wall.id, product.id)} variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {wall.products.length === 0 && !isProductPickerOpen && (
                    <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
                      No products added yet. Use Product to add one to this wall.
                    </div>
                  )}

                  {isProductPickerOpen && (
                    <div className="space-y-3 rounded-lg border bg-blue-50/40 p-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <Label>Product Type *</Label>
                          <Select value={tempProductType || ""} onValueChange={value => { setTempProductType(value as ProductTypeSlug); setTempProductId(""); }}>
                            <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(productTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {tempProductType && (
                          <div>
                            <Label>Product *</Label>
                            <Select value={tempProductId} onValueChange={setTempProductId}>
                              <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select product" /></SelectTrigger>
                              <SelectContent>
                                {productsByType?.map((product: any) => {
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
                        <div className="flex items-end gap-2">
                          <Button onClick={() => handleAddProductToWall(wall.id)} className="h-10 flex-1"><Plus className="mr-2 h-4 w-4" />Add</Button>
                          <Button onClick={closeProductPicker} type="button" variant="outline" className="h-10">Cancel</Button>
                        </div>
                      </div>

                      {tempProductType === "floating_cabinet" && (
                        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-white p-3 md:grid-cols-4">
                          <Input type="number" value={tempCabinetWidth} onChange={e => setTempCabinetWidth(e.target.value)} placeholder="Width mm" className="h-10" />
                          <Input type="number" value={tempCabinetHeight} onChange={e => setTempCabinetHeight(e.target.value)} placeholder="Height mm" className="h-10" />
                          <Input type="number" value={tempCabinetDepth} onChange={e => setTempCabinetDepth(e.target.value)} placeholder="Depth mm" className="h-10" />
                          <Input type="number" value={tempCabinetHeightFromFloor} onChange={e => setTempCabinetHeightFromFloor(e.target.value)} placeholder="From floor mm" className="h-10" />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            <Button onClick={() => goToStep("review")} disabled={!workflowReady} className="h-10 w-full">Review Quote</Button>
          </div>
        )}

        {currentStep === "review" && (
          <Card className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">Review Quote</h2>
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div>Client: <span className="font-medium">{clientName}</span></div>
              <div>Phone: <span className="font-medium">{clientPhone}</span></div>
              <div>Address: <span className="font-medium">{clientAddress}</span></div>
              <div>Suburb: <span className="font-medium">{suburb}</span></div>
            </div>

            <div className="space-y-3">
              {wallsWithProducts.map(wall => (
                <div key={wall.id} className="rounded-lg border p-3">
                  <h4 className="font-semibold">{wall.wallName} ({formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)})</h4>
                  <div className="mt-2 space-y-2">
                    {wall.products.map(product => (
                      <div key={product.id} className="flex justify-between gap-3 text-sm">
                        <span>Supply and install {product.productName}</span>
                        <span className="font-medium whitespace-nowrap">{product.quantity} x {formatMoney(product.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {manualReviewItems.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">Manual review flags</p>
                <ul className="mt-1 list-disc pl-5">
                  {manualReviewItems.map(({ wall, product }) => <li key={`${wall.id}-${product.id}`}>{wall.wallName} - {product.productName}</li>)}
                </ul>
              </div>
            )}

            <div className="text-right"><p className="text-2xl font-bold">Total: {formatMoney(calculateTotal())}</p></div>
            <Button onClick={() => handleSaveDraft(true)} className="h-10 w-full" disabled={saveInProgress || !workflowReady}>
              {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Quote
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
