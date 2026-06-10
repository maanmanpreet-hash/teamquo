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
  { id: "client", title: "Client details", icon: ClipboardList },
  { id: "walls", title: "Walls & products", icon: Ruler },
  { id: "review", title: "Review & save", icon: Save },
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
    return { obstructionStatus: "unknown", obstructionNotes: "" };
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
  const [tempWallType, setTempWallType] = useState<"regular" | "garage" | "custom">("regular");
  const [tempWallName, setTempWallName] = useState("");
  const [tempWallWidth, setTempWallWidth] = useState("");
  const [tempWallHeight, setTempWallHeight] = useState("");
  const [tempObstructionStatus, setTempObstructionStatus] =
    useState<ObstructionStatus>("unknown");
  const [tempObstructionNotes, setTempObstructionNotes] = useState("");

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
        wall.products
          .filter(product => product.manualReviewRequired)
          .map(product => ({ wall, product }))
      ),
    [wallsWithProducts]
  );

  const hasClientDetails = clientName.trim().length > 0;
  const hasWalls = wallsWithProducts.length > 0;
  const hasProducts = wallsWithProducts.some(wall => wall.products.length > 0);
  const wallsWithoutProducts = wallsWithProducts.filter(wall => wall.products.length === 0);
  const workflowReady = hasClientDetails && hasWalls && hasProducts && wallsWithoutProducts.length === 0;
  const saveInProgress = createJobMutation.isPending || updateJobMutation.isPending;

  const workflowIssues = [
    !hasClientDetails ? "Client name is required before the quote can move forward." : null,
    !hasWalls ? "At least one wall with dimensions is required." : null,
    hasWalls && !hasProducts ? "At least one product must be added under a wall." : null,
    wallsWithoutProducts.length > 0
      ? `${wallsWithoutProducts.length} wall(s) still have no products attached.`
      : null,
  ].filter(Boolean) as string[];

  const goToStep = (step: WorkflowStep) => {
    if (step === "walls" && !hasClientDetails) {
      toast.error("Enter the client name before adding walls/products");
      setCurrentStep("client");
      return;
    }
    if (step === "review" && !workflowReady) {
      toast.error("Complete client details, walls, and products before review/save");
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
    if (!tempWallType || !tempWallName || !tempWallWidth || !tempWallHeight) {
      toast.error("Please fill all wall details");
      return;
    }
    if (tempObstructionStatus === "present" && !tempObstructionNotes.trim()) {
      toast.error("Enter obstruction notes or select Unknown/No known obstructions");
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
        obstructionStatus: tempObstructionStatus,
        obstructionNotes: tempObstructionNotes.trim(),
        products: [],
      },
    ]);
    setTempWallType("regular");
    setTempWallName("");
    setTempWallWidth("");
    setTempWallHeight("");
    setTempObstructionStatus("unknown");
    setTempObstructionNotes("");
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
        currentWall.id === wallId
          ? { ...currentWall, products: [...currentWall.products, newProduct] }
          : currentWall
      )
    );
    setTempProductType(null);
    setTempProductId("");
    setTempCabinetWidth("");
    setTempCabinetHeight("");
    setTempCabinetDepth("");
    setTempCabinetHeightFromFloor("");
    toast.success("Product added to wall");
  };

  const handleDeleteWall = (wallId: string) => {
    setWallsWithProducts(wallsWithProducts.filter(wall => wall.id !== wallId));
  };

  const handleRemoveProduct = (wallId: string, productId: string) => {
    setWallsWithProducts(
      wallsWithProducts.map(wall =>
        wall.id === wallId
          ? { ...wall, products: wall.products.filter(product => product.id !== productId) }
          : wall
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
      toast.error("Complete all workflow items before saving the quote");
      setCurrentStep(!hasClientDetails ? "client" : "walls");
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
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/jobs")} variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Quote</h1>
              <p className="text-sm text-gray-600">Guided Team QUO workflow</p>
            </div>
          </div>
          <Button onClick={() => handleSaveDraft(false)} variant="outline" disabled={saveInProgress || !hasClientDetails}>
            {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Draft
          </Button>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const active = currentStep === step.id;
              const complete =
                step.id === "client" ? hasClientDetails : step.id === "walls" ? hasWalls && hasProducts : workflowReady;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    active ? "border-blue-500 bg-blue-50" : complete ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {complete ? <CheckCircle2 className="h-5 w-5 text-green-700" /> : <Icon className="h-5 w-5 text-blue-700" />}
                    <span className="font-semibold">{index + 1}. {step.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {workflowIssues.length > 0 && currentStep === "review" && (
          <Card className="mb-6 border-amber-300 bg-amber-50 p-4">
            <div className="flex gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">Workflow incomplete</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
                  {workflowIssues.map(issue => <li key={issue}>{issue}</li>)}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {manualReviewItems.length > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50 p-4">
            <div className="flex gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">Manual review required before relying on this quote</p>
                <p className="text-sm text-amber-800">Automatic quantity is a starting point only where joins, obstructions, or cut layout risk are present.</p>
              </div>
            </div>
          </Card>
        )}

        {currentStep === "client" && (
          <Card className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" className="mt-1 h-12 text-base" />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input id="clientEmail" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="john@example.com" className="mt-1 h-12 text-base" />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone</Label>
                <Input id="clientPhone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="0412 345 678" className="mt-1 h-12 text-base" />
              </div>
              <div>
                <Label htmlFor="clientAddress">Address</Label>
                <Input id="clientAddress" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St" className="mt-1 h-12 text-base" />
              </div>
              <div>
                <Label htmlFor="suburb">Suburb</Label>
                <Select value={suburb} onValueChange={setSuburb}>
                  <SelectTrigger className="mt-1 h-12 text-base"><SelectValue placeholder="Select suburb" /></SelectTrigger>
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
                <Label htmlFor="appointmentDate">Appointment Date</Label>
                <Input id="appointmentDate" type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className="mt-1 h-12 text-base" />
              </div>
              <div>
                <Label htmlFor="appointmentTime">Appointment Time</Label>
                <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                  <SelectTrigger className="mt-1 h-12 text-base"><SelectValue placeholder="Select time" /></SelectTrigger>
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

            <div className="border-t pt-4">
              <Label>Reference Image</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} className="mt-1 h-12 text-base" />
              {referenceImagePreview && (
                <div className="relative mt-2 inline-block">
                  <img src={referenceImagePreview} alt="Reference" className="max-h-48 rounded border-2 border-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceImageUrl("");
                      setReferenceImagePreview(null);
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    x
                  </button>
                </div>
              )}
            </div>

            <Button onClick={() => goToStep("walls")} disabled={!hasClientDetails} className="h-12 w-full text-base">
              Continue to Walls & Products
            </Button>
          </Card>
        )}

        {currentStep === "walls" && (
          <div className="space-y-4">
            <Card className="space-y-4 border-2 border-dashed p-6">
              <h2 className="text-lg font-semibold">Add New Wall</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Wall Type *</Label>
                  <Select value={tempWallType} onValueChange={value => setTempWallType(value as "regular" | "garage" | "custom")}>
                    <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Hallway Wall</SelectItem>
                      <SelectItem value="garage">Garage Wall</SelectItem>
                      <SelectItem value="custom">TV Wall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wallName">Wall Name *</Label>
                  <Input id="wallName" value={tempWallName} onChange={e => setTempWallName(e.target.value)} placeholder="e.g., Living Room" className="mt-1 h-12 text-base" />
                </div>
                <div>
                  <Label htmlFor="wallWidth">Width (m) *</Label>
                  <Input id="wallWidth" type="number" step="0.01" value={tempWallWidth} onChange={e => setTempWallWidth(e.target.value)} placeholder="e.g., 3.80" className="mt-1 h-12 text-base" />
                </div>
                <div>
                  <Label htmlFor="wallHeight">Height (m) *</Label>
                  <Input id="wallHeight" type="number" step="0.01" value={tempWallHeight} onChange={e => setTempWallHeight(e.target.value)} placeholder="e.g., 2.60" className="mt-1 h-12 text-base" />
                </div>
                <div>
                  <Label>Openings / Obstructions *</Label>
                  <Select value={tempObstructionStatus} onValueChange={value => setTempObstructionStatus(value as ObstructionStatus)}>
                    <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown / not checked</SelectItem>
                      <SelectItem value="none">No known obstructions</SelectItem>
                      <SelectItem value="present">Obstructions present</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="obstructionNotes">Obstruction / cut notes</Label>
                  <Input id="obstructionNotes" value={tempObstructionNotes} onChange={e => setTempObstructionNotes(e.target.value)} placeholder="e.g., TV recess, 2 power points" className="mt-1 h-12 text-base" />
                </div>
              </div>
              <Button onClick={handleAddWall} className="h-12 w-full text-base"><Plus className="mr-2 h-4 w-4" />Add Wall</Button>
            </Card>

            {wallsWithProducts.map(wall => (
              <Card key={wall.id} className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{wall.wallName}</h3>
                    <p className="text-sm text-gray-600">{wall.wallType} - {formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      Obstructions: {wall.obstructionStatus === "none" ? "No known obstructions" : wall.obstructionStatus === "present" ? wall.obstructionNotes || "Present" : "Unknown / not checked"}
                    </p>
                  </div>
                  <Button onClick={() => handleDeleteWall(wall.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Add Product to this Wall</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Product Type *</Label>
                      <Select value={tempProductType || ""} onValueChange={value => { setTempProductType(value as ProductTypeSlug); setTempProductId(""); }}>
                        <SelectTrigger className="mt-1 h-12 text-base"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(productTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {tempProductType && (
                      <div>
                        <Label>Product *</Label>
                        <Select value={tempProductId} onValueChange={setTempProductId}>
                          <SelectTrigger className="mt-1 h-12 text-base"><SelectValue placeholder="Select product" /></SelectTrigger>
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
                  </div>

                  {tempProductType && panelTypes(tempProductType) && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                      Panel quantity uses sheet width, sheet height, orientation rule, joins, obstruction status, and wastage. Unknown or present obstructions are flagged instead of guessed.
                    </div>
                  )}

                  {tempProductType === "floating_cabinet" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Input type="number" value={tempCabinetWidth} onChange={e => setTempCabinetWidth(e.target.value)} placeholder="Cabinet width mm" className="h-12 text-base" />
                      <Input type="number" value={tempCabinetHeight} onChange={e => setTempCabinetHeight(e.target.value)} placeholder="Cabinet height mm" className="h-12 text-base" />
                      <Input type="number" value={tempCabinetDepth} onChange={e => setTempCabinetDepth(e.target.value)} placeholder="Cabinet depth mm" className="h-12 text-base" />
                      <Input type="number" value={tempCabinetHeightFromFloor} onChange={e => setTempCabinetHeightFromFloor(e.target.value)} placeholder="Height from floor mm" className="h-12 text-base" />
                    </div>
                  )}

                  <Button onClick={() => handleAddProductToWall(wall.id)} className="h-12 w-full text-base"><Plus className="mr-2 h-4 w-4" />Add Product</Button>
                </div>

                {wall.products.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium">Products ({wall.products.length})</h4>
                    {wall.products.map(product => (
                      <div key={product.id} className="space-y-2 rounded-lg bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-gray-600">Qty: {product.quantity} x {formatMoney(product.unitPrice)} = {formatMoney(product.quantity * product.unitPrice)}</p>
                          </div>
                          <Button onClick={() => handleRemoveProduct(wall.id, product.id)} variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        {product.panelCalculation && (
                          <div className="space-y-1 rounded border bg-white p-3 text-xs text-gray-700">
                            <p><strong>Calculation:</strong> {product.panelCalculation.panelsAcross} across x {product.panelCalculation.panelsHigh} high = {product.panelCalculation.baseQuantity} base, +{product.panelCalculation.wastageQuantity} wastage = {product.panelCalculation.finalQuantity} total.</p>
                            <p><strong>Orientation:</strong> {product.panelCalculation.orientationLabel}</p>
                            {product.manualReviewRequired && <p className="font-semibold text-amber-700">Manual review required</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}

            <Button onClick={() => goToStep("review")} disabled={!workflowReady} className="h-12 w-full text-base">Review Quote</Button>
          </div>
        )}

        {currentStep === "review" && (
          <Card className="space-y-5 p-6">
            <h2 className="text-lg font-semibold">Quote Summary</h2>
            <div className="border-b pb-4">
              <h3 className="mb-2 font-medium">Client Details</h3>
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div>Name: <span className="font-medium">{clientName}</span></div>
                <div>Phone: <span className="font-medium">{clientPhone}</span></div>
                <div>Email: <span className="font-medium">{clientEmail}</span></div>
                <div>Address: <span className="font-medium">{clientAddress}</span></div>
                <div>Suburb: <span className="font-medium">{suburb}</span></div>
                <div>Appointment: <span className="font-medium">{appointmentDate} {appointmentTime}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Customer-facing quote lines</h3>
              {wallsWithProducts.map(wall => (
                <div key={wall.id} className="rounded-lg border p-4">
                  <h4 className="font-semibold">{wall.wallName} ({formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)})</h4>
                  <div className="mt-3 space-y-3">
                    {wall.products.map(product => (
                      <div key={product.id} className="flex justify-between gap-4 text-sm">
                        <div>
                          <p className="font-medium">Supply and install {product.productName}</p>
                          {product.customerNotes?.map(note => <p key={note} className="text-gray-600">{note}</p>)}
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p>{product.quantity} x {formatMoney(product.unitPrice)}</p>
                          <p className="font-semibold">{formatMoney(product.quantity * product.unitPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <h3 className="font-medium text-amber-900">Internal calculation notes</h3>
              {manualReviewItems.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800">No manual review flags currently shown.</p>
              ) : (
                <div className="mt-3 space-y-3 text-sm text-amber-900">
                  {manualReviewItems.map(({ wall, product }) => (
                    <div key={`${wall.id}-${product.id}`} className="rounded bg-white/70 p-3">
                      <p className="font-semibold">{wall.wallName} - {product.productName}: Manual review required</p>
                      <ul className="mt-1 list-disc pl-5">
                        {product.reviewReasons?.map(reason => <li key={reason}>{reason}</li>)}
                      </ul>
                      {product.internalNotes && product.internalNotes.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-amber-800">
                          {product.internalNotes.map(note => <li key={note}>{note}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right"><p className="text-2xl font-bold">Total: {formatMoney(calculateTotal())}</p></div>

            <Button onClick={() => handleSaveDraft(true)} className="h-12 w-full text-base" disabled={saveInProgress || !workflowReady}>
              {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Quote
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
