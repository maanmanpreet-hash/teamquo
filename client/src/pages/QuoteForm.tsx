"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, FileWarning, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  calculatePanelRequirement,
  parseMaterialMetadata,
  type ObstructionStatus,
  type PanelCalculationResult,
} from "@shared/quoteCalculations";

type ProductTypeSlug =
  | "cladding"
  | "acoustic_panel"
  | "floating_cabinet"
  | "fireplace"
  | "mirror"
  | "marble_sheet";

interface WallWithProducts {
  id: string;
  wallType: string;
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

const productTypeSlugAliases: Record<ProductTypeSlug, string[]> = {
  cladding: ["cladding"],
  acoustic_panel: ["acoustic_panel", "acoustic-panels"],
  floating_cabinet: [
    "floating_cabinet",
    "floating-cabinet",
    "floating-cabinets",
  ],
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
    if (
      parsed &&
      ["unknown", "none", "present"].includes(parsed.obstructionStatus)
    ) {
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

export default function QuoteForm() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTab, setCurrentTab] = useState("client");
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
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(
    null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [wallsWithProducts, setWallsWithProducts] = useState<WallWithProducts[]>(
    []
  );
  const [tempWallType, setTempWallType] = useState("regular");
  const [tempWallName, setTempWallName] = useState("");
  const [tempWallWidth, setTempWallWidth] = useState("");
  const [tempWallHeight, setTempWallHeight] = useState("");
  const [tempObstructionStatus, setTempObstructionStatus] =
    useState<ObstructionStatus>("unknown");
  const [tempObstructionNotes, setTempObstructionNotes] = useState("");

  const [tempProductType, setTempProductType] = useState<ProductTypeSlug | null>(
    null
  );
  const [tempProductId, setTempProductId] = useState("");
  const [tempCabinetWidth, setTempCabinetWidth] = useState("");
  const [tempCabinetHeight, setTempCabinetHeight] = useState("");
  const [tempCabinetDepth, setTempCabinetDepth] = useState("");
  const [tempCabinetHeightFromFloor, setTempCabinetHeightFromFloor] =
    useState("");

  const { data: productTypes } = trpc.products.listTypes.useQuery();
  const selectedProductTypeId = tempProductType
    ? productTypes?.find(type =>
        productTypeSlugAliases[tempProductType].includes(type.slug)
      )?.id || 0
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
  const deleteJobItemsByJobIdMutation =
    trpc.jobItems.deleteByJobId.useMutation();
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
    return (
      operators?.find(operator => operator.id.toString() === selectedOperator)
        ?.name || selectedOperator
    );
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
    if (
      !Number.isFinite(wallWidthMm) ||
      !Number.isFinite(wallHeightMm) ||
      wallWidthMm <= 0 ||
      wallHeightMm <= 0
    ) {
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

    const foundProduct = productsByType?.find(
      product => product.id.toString() === tempProductId
    );
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
      const panelCalculation = calculatePanelRequirement({
        wallWidthMm: wall.wallWidthMm,
        wallHeightMm: wall.wallHeightMm,
        panelWidthMm: foundProduct.widthMm || 0,
        panelHeightMm: foundProduct.heightMm || 0,
        productName: foundProduct.name,
        productDescription: foundProduct.description,
        obstructionStatus: wall.obstructionStatus,
        obstructionNotes: wall.obstructionNotes,
      });

      if (panelCalculation.finalQuantity <= 0) {
        toast.error("Manual review required: product dimensions are missing");
        return;
      }

      newProduct = {
        ...newProduct,
        panelWidthMm: foundProduct.widthMm || 0,
        panelHeightMm: foundProduct.heightMm || 0,
        quantity: panelCalculation.finalQuantity,
        panelCalculation,
        manualReviewRequired: panelCalculation.manualReviewRequired,
        reviewReasons: panelCalculation.reviewReasons,
        internalNotes: panelCalculation.internalNotes,
        customerNotes: panelCalculation.customerNotes,
      };

      if (panelCalculation.manualReviewRequired) {
        toast.warning("Product added, but manual review is required");
      }
    }

    if (tempProductType === "floating_cabinet") {
      if (
        !tempCabinetWidth ||
        !tempCabinetHeight ||
        !tempCabinetDepth ||
        !tempCabinetHeightFromFloor
      ) {
        toast.error("Please enter all cabinet dimensions");
        return;
      }

      const cabinetWidthMm = Math.round(Number(tempCabinetWidth));
      const cabinetHeightMm = Math.round(Number(tempCabinetHeight));
      const cabinetDepthMm = Math.round(Number(tempCabinetDepth));
      const cabinetHeightFromFloorMm = Math.round(
        Number(tempCabinetHeightFromFloor)
      );

      if (
        !Number.isFinite(cabinetWidthMm) ||
        !Number.isFinite(cabinetHeightMm) ||
        !Number.isFinite(cabinetDepthMm) ||
        !Number.isFinite(cabinetHeightFromFloorMm) ||
        cabinetWidthMm <= 0 ||
        cabinetHeightMm <= 0 ||
        cabinetDepthMm <= 0 ||
        cabinetHeightFromFloorMm < 0
      ) {
        toast.error("Cabinet dimensions must be valid positive numbers");
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
      wallsWithProducts.map(w =>
        w.id === wallId ? { ...w, products: [...w.products, newProduct] } : w
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

  const handleRemoveProduct = (wallId: string, productId: string) => {
    setWallsWithProducts(
      wallsWithProducts.map(w =>
        w.id === wallId
          ? { ...w, products: w.products.filter(p => p.id !== productId) }
          : w
      )
    );
    toast.success("Product removed");
  };

  const handleDeleteWall = (wallId: string) => {
    setWallsWithProducts(wallsWithProducts.filter(w => w.id !== wallId));
    toast.success("Wall deleted");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type
      )
    ) {
      toast.error("Only JPEG, PNG, WebP, and GIF are supported");
      return;
    }

    setIsUploadingImage(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const result = await uploadImageMutation.mutateAsync({
        base64Data: base64,
        fileName: file.name,
        mimeType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif",
      });
      setReferenceImageUrl(result.url);
      setReferenceImagePreview(result.url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateQuoteBeforeSave = () => {
    if (!clientName.trim()) {
      toast.error("Please enter client name before saving the quote");
      return false;
    }

    for (const wall of wallsWithProducts) {
      if (wall.wallWidthMm <= 0 || wall.wallHeightMm <= 0) {
        toast.error(`Wall dimensions are invalid for ${wall.wallName}`);
        return false;
      }

      for (const product of wall.products) {
        if (!product.productId || Number.isNaN(Number(product.productId))) {
          toast.error(`Please select a valid product for ${wall.wallName}`);
          return false;
        }
        if (!Number.isFinite(product.quantity) || product.quantity <= 0) {
          toast.error(`Quantity is invalid for ${product.productName}`);
          return false;
        }
        if (!Number.isFinite(product.unitPrice) || product.unitPrice < 0) {
          toast.error(`Unit price is invalid for ${product.productName}`);
          return false;
        }
        if (
          panelTypes(product.productType) &&
          (!product.panelWidthMm ||
            product.panelWidthMm <= 0 ||
            !product.panelHeightMm ||
            product.panelHeightMm <= 0)
        ) {
          toast.error(`Panel dimensions are invalid for ${product.productName}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateQuoteBeforeSave()) return;

    const manualReviewCount = wallsWithProducts.reduce(
      (count, wall) =>
        count + wall.products.filter(product => product.manualReviewRequired).length,
      0
    );

    try {
      let jobId = resumeJobId;
      const totalEstimate = calculateTotal();
      const operatorName = getSelectedOperatorName();

      if (!jobId) {
        const job = await createJobMutation.mutateAsync({
          clientName: clientName.trim(),
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          clientAddress: clientAddress || undefined,
          suburb: suburb || undefined,
          appointmentDate: appointmentDate || undefined,
          appointmentTime: appointmentTime || undefined,
          referenceImageUrl: referenceImageUrl || undefined,
          operatorName,
          totalEstimate,
        });
        if (job && "id" in job) {
          jobId = (job as any).id;
          setResumeJobId((job as any).id);
        }
      } else {
        await updateJobMutation.mutateAsync({
          id: jobId,
          clientName: clientName.trim(),
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          clientAddress: clientAddress || undefined,
          suburb: suburb || undefined,
          appointmentDate: appointmentDate || undefined,
          appointmentTime: appointmentTime || undefined,
          referenceImageUrl: referenceImageUrl || undefined,
          operatorName,
          totalEstimate,
        });

        await deleteJobItemsByJobIdMutation.mutateAsync({ jobId });
        await deleteWallsByJobIdMutation.mutateAsync({ jobId });
      }

      if (!jobId) throw new Error("Quote could not be created");

      for (const wall of wallsWithProducts) {
        const createdWall = await createWallMutation.mutateAsync({
          jobId,
          wallType: wall.wallType as "regular" | "garage" | "custom",
          wallName: wall.wallName,
          wallWidthMm: wall.wallWidthMm,
          wallHeightMm: wall.wallHeightMm,
          notes: encodeWallNotes(wall.obstructionStatus, wall.obstructionNotes),
        });

        const wallId = (createdWall as any)?.id;
        if (!wallId) throw new Error("Wall could not be saved");

        for (const product of wall.products) {
          await createJobItemMutation.mutateAsync({
            jobId,
            wallId,
            itemType: product.productType,
            productId: Number(product.productId),
            claddingVariantId: undefined,
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

      if (manualReviewCount > 0) {
        toast.warning(
          `Quote saved. ${manualReviewCount} item(s) still require manual review.`
        );
      } else {
        toast.success("Quote saved as draft");
      }
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    }
  };

  const calculateTotal = () =>
    wallsWithProducts.reduce(
      (total, wall) =>
        total +
        wall.products.reduce(
          (wallTotal, product) => wallTotal + product.quantity * product.unitPrice,
          0
        ),
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

  const canSaveDraft = clientName.trim().length > 0;
  const saveInProgress = createJobMutation.isPending || updateJobMutation.isPending;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/jobs")}
              variant="ghost"
              size="icon"
              className="h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Quote</h1>
              <p className="text-sm text-gray-600">
                Measurement-first cladding quote workflow
              </p>
            </div>
          </div>
        </div>

        {manualReviewItems.length > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50 p-4">
            <div className="flex gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">
                  Manual review required before relying on this quote
                </p>
                <p className="text-sm text-amber-800">
                  Automatic quantity is a starting point only where joins,
                  obstructions, or cut layout risk are present.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="client">Client Details</TabsTrigger>
            <TabsTrigger value="walls">Walls & Products</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Phone</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="0412 345 678"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress">Address</Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={e => setClientAddress(e.target.value)}
                    placeholder="123 Main St"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="suburb">Suburb</Label>
                  <Select value={suburb} onValueChange={setSuburb}>
                    <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                      <SelectValue placeholder="Select suburb" />
                    </SelectTrigger>
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
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="appointmentTime">Appointment Time</Label>
                  <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                    <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 48 }).map((_, i) => {
                        const hour = Math.floor(i / 2);
                        const minute = (i % 2) * 30;
                        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                        return (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Reference Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="mt-1 h-12 text-base border-2 border-gray-200"
                />
                {referenceImagePreview && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={referenceImagePreview}
                      alt="Reference"
                      className="max-h-48 rounded border-2 border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setReferenceImageUrl("");
                        setReferenceImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSaveDraft}
                variant="outline"
                className="w-full h-12 text-base"
                disabled={saveInProgress || !canSaveDraft}
              >
                {saveInProgress && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Draft
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="walls" className="space-y-4">
            <Card className="p-6 space-y-4 border-2 border-dashed">
              <h2 className="text-lg font-semibold">Add New Wall</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wallType">Wall Type *</Label>
                  <Select value={tempWallType} onValueChange={setTempWallType}>
                    <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Hallway Wall</SelectItem>
                      <SelectItem value="garage">Garage Wall</SelectItem>
                      <SelectItem value="custom">TV Wall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wallName">Wall Name *</Label>
                  <Input
                    id="wallName"
                    value={tempWallName}
                    onChange={e => setTempWallName(e.target.value)}
                    placeholder="e.g., Living Room"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="wallWidth">Width (m) *</Label>
                  <Input
                    id="wallWidth"
                    type="number"
                    step="0.01"
                    value={tempWallWidth}
                    onChange={e => setTempWallWidth(e.target.value)}
                    placeholder="e.g., 3.80"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="wallHeight">Height (m) *</Label>
                  <Input
                    id="wallHeight"
                    type="number"
                    step="0.01"
                    value={tempWallHeight}
                    onChange={e => setTempWallHeight(e.target.value)}
                    placeholder="e.g., 2.60"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label>Openings / Obstructions *</Label>
                  <Select
                    value={tempObstructionStatus}
                    onValueChange={value =>
                      setTempObstructionStatus(value as ObstructionStatus)
                    }
                  >
                    <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown / not checked</SelectItem>
                      <SelectItem value="none">No known obstructions</SelectItem>
                      <SelectItem value="present">Obstructions present</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="obstructionNotes">Obstruction / cut notes</Label>
                  <Input
                    id="obstructionNotes"
                    value={tempObstructionNotes}
                    onChange={e => setTempObstructionNotes(e.target.value)}
                    placeholder="e.g., TV recess, 2 power points, fireplace return"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
              </div>
              <Button onClick={handleAddWall} className="w-full h-12 text-base">
                <Plus className="w-4 h-4 mr-2" />
                Add Wall
              </Button>
            </Card>

            <div className="space-y-4">
              {wallsWithProducts.map(wall => (
                <Card key={wall.id} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{wall.wallName}</h3>
                      <p className="text-sm text-gray-600">
                        {wall.wallType} • {formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Obstructions: {wall.obstructionStatus === "none" ? "No known obstructions" : wall.obstructionStatus === "present" ? wall.obstructionNotes || "Present" : "Unknown / not checked"}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleDeleteWall(wall.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Add Product to this Wall</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Product Type *</Label>
                        <Select
                          value={tempProductType || ""}
                          onValueChange={value => {
                            setTempProductType(value as ProductTypeSlug);
                            setTempProductId("");
                          }}
                        >
                          <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(productTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {tempProductType && (
                        <div>
                          <Label>Product *</Label>
                          <Select value={tempProductId} onValueChange={setTempProductId}>
                            <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsByType?.map((product: any) => {
                                const metadata = parseMaterialMetadata(product.description);
                                return (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} - {formatMoney(product.pricePerUnit)}
                                    {metadata.wastagePercent !== undefined
                                      ? ` - ${metadata.wastagePercent}% wastage`
                                      : ""}
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
                        Panel quantity uses sheet width, sheet height, orientation rule,
                        joins, obstruction status, and wastage. Unknown or present
                        obstructions are flagged instead of guessed.
                      </div>
                    )}

                    {tempProductType === "floating_cabinet" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Width (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetWidth}
                            onChange={e => setTempCabinetWidth(e.target.value)}
                            placeholder="e.g., 1800"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label>Height (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetHeight}
                            onChange={e => setTempCabinetHeight(e.target.value)}
                            placeholder="e.g., 400"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label>Depth (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetDepth}
                            onChange={e => setTempCabinetDepth(e.target.value)}
                            placeholder="e.g., 300"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label>Height from Floor (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetHeightFromFloor}
                            onChange={e => setTempCabinetHeightFromFloor(e.target.value)}
                            placeholder="e.g., 800"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => handleAddProductToWall(wall.id)}
                      className="w-full h-12 text-base"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>

                  {wall.products.length > 0 && (
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="font-medium">Products ({wall.products.length})</h4>
                      {wall.products.map(product => (
                        <div
                          key={product.id}
                          className="rounded-lg bg-gray-50 p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-gray-600">
                                Qty: {product.quantity} x {formatMoney(product.unitPrice)} = {formatMoney(product.quantity * product.unitPrice)}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleRemoveProduct(wall.id, product.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {product.panelCalculation && (
                            <div className="rounded border bg-white p-3 text-xs text-gray-700 space-y-1">
                              <p>
                                <strong>Calculation:</strong>{" "}
                                {product.panelCalculation.panelsAcross} across x {product.panelCalculation.panelsHigh} high = {product.panelCalculation.baseQuantity} base, +{product.panelCalculation.wastageQuantity} wastage = {product.panelCalculation.finalQuantity} total.
                              </p>
                              <p>
                                <strong>Orientation:</strong>{" "}
                                {product.panelCalculation.orientationLabel}
                              </p>
                              {product.manualReviewRequired && (
                                <p className="font-semibold text-amber-700">
                                  Manual review required
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card className="p-6 space-y-5">
              <h2 className="text-lg font-semibold">Quote Summary</h2>

              <div className="border-b pb-4">
                <h3 className="font-medium mb-2">Client Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
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
                    <h4 className="font-semibold">
                      {wall.wallName} ({formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)})
                    </h4>
                    {wall.products.length === 0 ? (
                      <p className="text-sm text-gray-500 mt-2">No products added.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {wall.products.map(product => (
                          <div key={product.id} className="text-sm">
                            <div className="flex justify-between gap-4">
                              <div>
                                <p className="font-medium">Supply and install {product.productName}</p>
                                {product.customerNotes?.map(note => (
                                  <p key={note} className="text-gray-600">{note}</p>
                                ))}
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <p>{product.quantity} x {formatMoney(product.unitPrice)}</p>
                                <p className="font-semibold">{formatMoney(product.quantity * product.unitPrice)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <h3 className="font-medium text-amber-900">Internal calculation notes</h3>
                {manualReviewItems.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-800">
                    No manual review flags currently shown.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3 text-sm text-amber-900">
                    {manualReviewItems.map(({ wall, product }) => (
                      <div key={`${wall.id}-${product.id}`} className="rounded bg-white/70 p-3">
                        <p className="font-semibold">
                          {wall.wallName} - {product.productName}: Manual review required
                        </p>
                        <ul className="list-disc pl-5 mt-1">
                          {product.reviewReasons?.map(reason => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        {product.internalNotes && product.internalNotes.length > 0 && (
                          <ul className="list-disc pl-5 mt-2 text-amber-800">
                            {product.internalNotes.map(note => (
                              <li key={note}>{note}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold">
                  Total: {formatMoney(calculateTotal())}
                </p>
              </div>

              <Button
                onClick={handleSaveDraft}
                className="w-full h-12 text-base"
                disabled={saveInProgress || !canSaveDraft}
              >
                {saveInProgress && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Quote
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
