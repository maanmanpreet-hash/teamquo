"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  FileWarning,
  Loader2,
  Ruler,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/_core/hooks/useAuth";
import { QuoteClientStep } from "@/components/quote/QuoteClientStep";
import { QuoteReviewStep } from "@/components/quote/QuoteReviewStep";
import { QuoteStepNav } from "@/components/quote/QuoteStepNav";
import { QuoteWallsStep } from "@/components/quote/QuoteWallsStep";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasCustomerIdentifier, getCustomerIdentifierError } from "@/lib/customerIdentity";
import {
  formatDateInput,
} from "@/lib/quote/formatters";
import {
  applyItemDetailsToProduct,
  buildItemDetails,
  formatPositiveNumberList,
  formatShelfHeightsBySection,
  parsePositiveNumberList,
  parseShelfHeightsBySection,
} from "@/lib/quote/itemDetails";
import {
  panelTypes,
  resolveCatalogProductTypeId,
} from "@/lib/quote/productTypeHelpers";
import { buildQuoteFormMaterialSummary } from "@/lib/quoteMaterialSummary";
import {
  getResumeJobIdFromLocation,
  shouldResetQuoteFormForResumeChange,
} from "@/lib/quote/resumeQuote";
import {
  getBackdropDimensionsFromCatalogProduct,
} from "@/lib/quote/tvBackdropForm";
import type {
  AcousticFixingMethod,
  CustomItemOption,
  ProductTypeSlug,
  WallProduct,
  WallWithProducts,
  WorkflowStep,
} from "@/lib/quote/types";
import {
  decodeWallNotes,
  encodeWallNotes,
  getManualWallSupplyInstallPrice,
  hasManualWallSupplyInstallPrice,
} from "@/lib/quote/wallNotes";
import { trpc } from "@/lib/trpc";
import {
  decodeQuoteMeta,
  encodeQuoteMeta,
  normaliseCustomerAddOns,
  type CustomerAddOn,
} from "@shared/quote";
import {
  calculatePanelRequirement,
  parseMaterialMetadata,
} from "@shared/quoteCalculations";
import {
  DEFAULT_CABINET_TO_TV_GAP_MM,
  DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM,
} from "@shared/tvSetout";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mapSavedWallsToFormWalls(
  savedWalls: any[],
  legacyQuoteLevelPriceCents?: number | null
): WallWithProducts[] {
  return savedWalls.map((wall: any) => {
    const decodedNotes = decodeWallNotes(wall.notes);
    // Guardrail: `totalEstimate` is a legacy/ambiguous persisted field name.
    // In the current workflow, customer-facing pricing comes from the manual
    // per-wall Supply & Install values, not from internal material-cost math.
    //
    // Older drafts stored a single quote-level totalEstimate value.
    // We only use it as a fallback when restoring a one-wall quote and otherwise
    // preserve the per-wall manual Supply & Install pricing model.
    const fallbackSupplyInstallPrice =
      savedWalls.length === 1 &&
      (decodedNotes.supplyInstallPrice === null || decodedNotes.supplyInstallPrice === undefined) &&
      Number.isFinite(legacyQuoteLevelPriceCents)
        ? Math.max(0, Math.round(Number(legacyQuoteLevelPriceCents)))
        : 0;
    return {
      id: wall.id.toString(),
      wallType: wall.wallType,
      wallName: wall.wallName || "Wall",
      wallWidthMm: wall.wallWidthMm || 0,
      wallHeightMm: wall.wallHeightMm || 0,
      obstructionStatus: decodedNotes.obstructionStatus,
      obstructionNotes: decodedNotes.obstructionNotes,
      supplyInstallPrice: decodedNotes.supplyInstallPrice ?? fallbackSupplyInstallPrice,
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

        const baseProduct: WallProduct = {
          id: item.id.toString(),
          productType,
          productId: String(item.productId || item.claddingVariantId || ""),
          productName: productType === "tv_backdrop" ? "TV Backdrop" : item.productName || item.productDesign || item.itemType,
          catalogProductName: productType === "tv_backdrop" ? item.productName || item.productDesign || undefined : undefined,
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

        // Guardrail: `itemDetails` is an implicit JSON schema shared across save,
        // resume, and document generation. Keep JSON parsing/merging centralized
        // in the known helpers rather than adding ad-hoc parsing in this page.
        return applyItemDetailsToProduct(baseProduct, item.itemDetails);
      }),
    };
  });
}

function parseMillimetresInput(value: string) {
  return Number(value.replace(/,/g, "").trim());
}

export default function QuoteForm() {
  // Guardrail for future refactors: this page still combines workflow state and
  // UI rendering. Extract additional pure helpers first before attempting to
  // split the component tree so pricing/save-resume behaviour stays stable.
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("client");
  const [resumeJobId, setResumeJobId] = useState<number | null>(null);

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
  const [customerAddOns, setCustomerAddOns] = useState<CustomerAddOn[]>(() => normaliseCustomerAddOns([]));
  const [tempWallType, setTempWallType] = useState<"regular" | "garage" | "custom">("custom");
  const [tempWallName, setTempWallName] = useState("");
  const [tempWallWidth, setTempWallWidth] = useState("");
  const [tempWallHeight, setTempWallHeight] = useState("");

  const [activeProductWallId, setActiveProductWallId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [tempProductType, setTempProductType] = useState<ProductTypeSlug | null>(null);
  const [tempProductId, setTempProductId] = useState("");
  const [tempCustomItemType, setTempCustomItemType] = useState<CustomItemOption | "">("");
  const [tempCabinetWidth, setTempCabinetWidth] = useState("");
  const [tempCabinetHeight, setTempCabinetHeight] = useState("");
  const [tempCabinetDepth, setTempCabinetDepth] = useState("");
  const [tempCabinetHeightFromFloor, setTempCabinetHeightFromFloor] = useState("");
  const [tempCabinetSectionWidths, setTempCabinetSectionWidths] = useState("");
  const [tempCabinetShelfHeightsBySection, setTempCabinetShelfHeightsBySection] = useState("");
  const [tempClientPreferenceNotes, setTempClientPreferenceNotes] = useState("");
  const [tempTvSizeInches, setTempTvSizeInches] = useState("");
  const [tempBackdropWidthMm, setTempBackdropWidthMm] = useState("");
  const [tempBackdropHeightMm, setTempBackdropHeightMm] = useState("");
  const [tempTvBottomAfflMm, setTempTvBottomAfflMm] = useState("");
  const [tempCabinetTopAfflMm, setTempCabinetTopAfflMm] = useState("");
  const [tempCabinetToTvGapMm, setTempCabinetToTvGapMm] = useState("");
  const [tempIncludeTvBracket, setTempIncludeTvBracket] = useState(false);
  const [tempAcousticFixingMethod, setTempAcousticFixingMethod] = useState<AcousticFixingMethod>("none");

  const { data: productTypes } = trpc.products.listTypes.useQuery();
  const selectedProductTypeId = resolveCatalogProductTypeId(tempProductType, productTypes);
  const { data: productsByType } = trpc.products.listByType.useQuery(
    { productTypeId: selectedProductTypeId },
    { enabled: selectedProductTypeId > 0 }
  );
  const { data: operators } = trpc.operators.list.useQuery();
  const { data: draftJob, isLoading: draftJobLoading } = trpc.jobs.getById.useQuery(
    { id: resumeJobId || 0 },
    { enabled: resumeJobId !== null }
  );
  const { data: savedWalls, isLoading: savedWallsLoading } = trpc.walls.getByJobId.useQuery(
    { jobId: resumeJobId || 0 },
    { enabled: resumeJobId !== null }
  );

  const saveQuoteMutation = trpc.jobs.saveQuote.useMutation();
  const uploadImageMutation = trpc.storage.uploadImage.useMutation();

  const resetQuoteForm = () => {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
    setSuburb("");
    setAppointmentDate("");
    setAppointmentTime("");
    setReferenceImageUrl("");
    setReferenceImagePreview(null);
    setWallsWithProducts([]);
    setCustomerAddOns(normaliseCustomerAddOns([]));
    setTempWallType("custom");
    setTempWallName("");
    setTempWallWidth("");
    setTempWallHeight("");
    setCurrentStep("client");
    closeProductPicker();
  };

  const applySavedJobToForm = (job: any) => {
    // Guardrail: quote-level `notes` currently carries structured metadata such
    // as customer add-ons. Treat it as a legacy container and parse only through
    // shared helpers so save/resume stays stable.
    const quoteMeta = decodeQuoteMeta(job.notes);
    setClientName(job.clientName === "[Draft]" ? "" : job.clientName || "");
    setClientEmail(job.clientEmail || "");
    setClientPhone(job.clientPhone || "");
    setClientAddress(job.clientAddress || "");
    setSuburb(job.suburb || "");
    setAppointmentDate(formatDateInput(job.appointmentDate));
    setAppointmentTime(job.appointmentTime || "");
    setReferenceImageUrl(job.referenceImageUrl || "");
    setReferenceImagePreview(job.referenceImageUrl || null);
    setCustomerAddOns(normaliseCustomerAddOns(quoteMeta.customerAddOns));
  };

  useEffect(() => {
    const nextResumeJobId = getResumeJobIdFromLocation(location);
    if (shouldResetQuoteFormForResumeChange(resumeJobId, nextResumeJobId)) {
      resetQuoteForm();
    }
    setResumeJobId(nextResumeJobId);
  }, [location]);

  useEffect(() => {
    if (!draftJob || !resumeJobId) return;

    applySavedJobToForm(draftJob);

    if (draftJob.operatorName && operators) {
      const matchingOperator = operators.find((operator: any) => operator.name === draftJob.operatorName);
      localStorage.setItem("selectedOperator", matchingOperator ? String(matchingOperator.id) : draftJob.operatorName);
    } else if (resumeJobId) {
      localStorage.removeItem("selectedOperator");
    }
  }, [draftJob, operators, resumeJobId]);

  useEffect(() => {
    if (!resumeJobId || savedWalls === undefined) return;
    setWallsWithProducts(mapSavedWallsToFormWalls(savedWalls, draftJob?.totalEstimate));
  }, [draftJob?.totalEstimate, resumeJobId, savedWalls]);

  useEffect(() => {
    if (tempProductType !== "tv_backdrop") return;
    if (!productsByType || productsByType.length === 0) return;
    const currentExists = productsByType.some((product: any) => product.id.toString() === tempProductId);
    if (currentExists) return;
    setTempProductId(String(productsByType[0].id));
  }, [productsByType, tempProductId, tempProductType]);

  const getSelectedOperatorName = () => {
    const selectedOperator = localStorage.getItem("selectedOperator");
    if (!selectedOperator) return undefined;
    return operators?.find((operator: any) => operator.id.toString() === selectedOperator)?.name || selectedOperator;
  };

  const calculateTotal = () =>
    wallsWithProducts.reduce(
      (total, wall) =>
        // Guardrail: customer-facing quote total comes from manual wall Supply & Install
        // pricing only. Internal associated/material cost stays separate.
        total + getManualWallSupplyInstallPrice(wall),
      0
    );

  const materialSummary = useMemo(() => buildQuoteFormMaterialSummary(wallsWithProducts), [wallsWithProducts]);
  const activeWallFloatingCabinet = activeProductWallId ? getFloatingCabinetForWall(activeProductWallId) : undefined;
  const selectedBackdropProduct =
    tempProductType === "tv_backdrop" ? productsByType?.find((product: any) => product.id.toString() === tempProductId) : undefined;
  const selectedBackdropDimensions = getBackdropDimensionsFromCatalogProduct(selectedBackdropProduct);

  const manualReviewItems = useMemo(
    () =>
      wallsWithProducts.flatMap(wall =>
        wall.products.filter(product => product.manualReviewRequired).map(product => ({ wall, product }))
      ),
    [wallsWithProducts]
  );

  const hasClientDetails = hasCustomerIdentifier({ clientName, clientEmail, clientPhone, clientAddress });
  const hasWalls = wallsWithProducts.length > 0;
  const hasProducts = wallsWithProducts.some(wall => wall.products.length > 0);
  const wallsWithoutProducts = wallsWithProducts.filter(wall => wall.products.length === 0);
  const wallsWithoutPricing = wallsWithProducts.filter(wall => !hasManualWallSupplyInstallPrice(wall));
  const reviewReady = hasClientDetails && hasWalls && hasProducts && wallsWithoutProducts.length === 0;
  const workflowReady = reviewReady && wallsWithoutPricing.length === 0;
  const isResumeLoading = resumeJobId !== null && (draftJobLoading || savedWallsLoading);
  const saveInProgress =
    saveQuoteMutation.isPending ||
    uploadImageMutation.isPending ||
    isUploadingImage;
  const formBusy = saveInProgress || isResumeLoading;

  const resetProductDraft = () => {
    setEditingProductId(null);
    setTempProductType(null);
    setTempProductId("");
    setTempCustomItemType("");
    setTempCabinetWidth("");
    setTempCabinetHeight("");
    setTempCabinetDepth("");
    setTempCabinetHeightFromFloor("");
    setTempCabinetSectionWidths("");
    setTempCabinetShelfHeightsBySection("");
    setTempClientPreferenceNotes("");
    setTempTvSizeInches("");
    setTempBackdropWidthMm("");
    setTempBackdropHeightMm("");
    setTempTvBottomAfflMm("");
    setTempCabinetTopAfflMm("");
    setTempCabinetToTvGapMm("");
    setTempIncludeTvBracket(false);
    setTempAcousticFixingMethod("none");
  };

  function getFloatingCabinetForWall(wallId: string) {
    const wall = wallsWithProducts.find(candidate => candidate.id === wallId);
    return wall?.products.find(product => product.productType === "floating_cabinet");
  }

  const syncTvBackdropCabinetFieldsFromWall = (wallId: string) => {
    const floatingCabinet = getFloatingCabinetForWall(wallId);
    if (!floatingCabinet) return;

    const cabinetBottomAfflMm =
      floatingCabinet.cabinetHeightFromFloorMm !== undefined
        ? floatingCabinet.cabinetHeightFromFloorMm
        : DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM;
    const cabinetHeightMm =
      floatingCabinet.cabinetHeightMm !== undefined ? floatingCabinet.cabinetHeightMm : undefined;
    const cabinetTopAfflMm =
      cabinetBottomAfflMm !== undefined && cabinetHeightMm !== undefined
        ? cabinetBottomAfflMm + cabinetHeightMm
        : undefined;

    setTempCabinetHeightFromFloor(cabinetBottomAfflMm !== undefined ? String(cabinetBottomAfflMm) : "");
    setTempCabinetHeight(cabinetHeightMm !== undefined ? String(cabinetHeightMm) : "");
    setTempCabinetTopAfflMm(cabinetTopAfflMm !== undefined ? String(cabinetTopAfflMm) : "");
    setTempCabinetToTvGapMm(currentValue => currentValue || String(DEFAULT_CABINET_TO_TV_GAP_MM));
  };

  const openProductPicker = (wallId: string) => {
    resetProductDraft();
    setActiveProductWallId(wallId);
  };

  const handleProductTypeChange = (value: ProductTypeSlug) => {
    setTempProductType(value);
    setTempProductId("");
    setTempCustomItemType("");
    setTempCabinetWidth("");
    setTempCabinetHeight("");
    setTempCabinetDepth("");
    setTempCabinetHeightFromFloor("");
    setTempCabinetSectionWidths("");
    setTempCabinetShelfHeightsBySection("");
    setTempClientPreferenceNotes("");
    setTempTvSizeInches("");
    setTempBackdropWidthMm("");
    setTempBackdropHeightMm("");
    setTempTvBottomAfflMm("");
    setTempCabinetTopAfflMm("");
    setTempCabinetToTvGapMm("");
    setTempIncludeTvBracket(false);
    setTempAcousticFixingMethod("none");

    if (value === "tv_backdrop" && activeProductWallId) {
      syncTvBackdropCabinetFieldsFromWall(activeProductWallId);
    }
  };

  const openProductEditor = (wallId: string, product: WallProduct) => {
    setActiveProductWallId(wallId);
    setEditingProductId(product.id);
    setTempProductType(product.productType);
    setTempProductId(product.productId);
    setTempCustomItemType(product.customItemType || "");
    setTempCabinetWidth(product.cabinetWidthMm ? String(product.cabinetWidthMm) : "");
    setTempCabinetHeight(product.cabinetHeightMm ? String(product.cabinetHeightMm) : "");
    setTempCabinetDepth(product.cabinetDepthMm ? String(product.cabinetDepthMm) : "");
    setTempCabinetHeightFromFloor(
      product.cabinetHeightFromFloorMm !== undefined ? String(product.cabinetHeightFromFloorMm) : ""
    );
    setTempCabinetSectionWidths(formatPositiveNumberList(product.cabinetSectionWidthsMm));
    setTempCabinetShelfHeightsBySection(formatShelfHeightsBySection(product.cabinetShelfHeightsBySectionMm));
    setTempClientPreferenceNotes(product.clientPreferenceNotes || "");
    setTempTvSizeInches(product.tvSizeInches ? String(product.tvSizeInches) : "");
    setTempBackdropWidthMm(product.backdropWidthMm ? String(product.backdropWidthMm) : "");
    setTempBackdropHeightMm(product.backdropHeightMm ? String(product.backdropHeightMm) : "");
    setTempTvBottomAfflMm(product.tvBottomAfflMm !== undefined ? String(product.tvBottomAfflMm) : "");
    setTempCabinetTopAfflMm(product.cabinetTopAfflMm !== undefined ? String(product.cabinetTopAfflMm) : "");
    setTempCabinetToTvGapMm(product.cabinetToTvGapMm !== undefined ? String(product.cabinetToTvGapMm) : "");
    setTempIncludeTvBracket(Boolean(product.includeTvBracket));
    setTempAcousticFixingMethod(product.acousticFixingMethod || "none");

    if (product.productType === "tv_backdrop") {
      const floatingCabinet = getFloatingCabinetForWall(wallId);
      if (floatingCabinet) {
        const cabinetBottomAfflMm =
          floatingCabinet.cabinetHeightFromFloorMm !== undefined
            ? floatingCabinet.cabinetHeightFromFloorMm
            : product.cabinetHeightFromFloorMm ?? DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM;
        const cabinetHeightMm =
          floatingCabinet.cabinetHeightMm !== undefined ? floatingCabinet.cabinetHeightMm : product.cabinetHeightMm;
        const cabinetTopAfflMm =
          cabinetBottomAfflMm !== undefined && cabinetHeightMm !== undefined
            ? cabinetBottomAfflMm + cabinetHeightMm
            : product.cabinetTopAfflMm;

        setTempCabinetHeightFromFloor(cabinetBottomAfflMm !== undefined ? String(cabinetBottomAfflMm) : "");
        setTempCabinetHeight(cabinetHeightMm !== undefined ? String(cabinetHeightMm) : "");
        setTempCabinetTopAfflMm(cabinetTopAfflMm !== undefined ? String(cabinetTopAfflMm) : "");
      }
    }
  };

  const closeProductPicker = () => {
    resetProductDraft();
    setActiveProductWallId(null);
  };

  const goToStep = (step: WorkflowStep) => {
    if (step === "walls" && !hasClientDetails) {
      toast.error(getCustomerIdentifierError({ clientName, clientEmail, clientPhone, clientAddress }));
      setCurrentStep("client");
      return;
    }
    if (step === "review" && !reviewReady) {
      toast.error("Add customer details, wall dimensions, and products before review");
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

    const wallWidthMm = Math.round(parseMillimetresInput(tempWallWidth));
    const wallHeightMm = Math.round(parseMillimetresInput(tempWallHeight));
    if (!Number.isFinite(wallWidthMm) || !Number.isFinite(wallHeightMm) || wallWidthMm <= 0 || wallHeightMm <= 0) {
      toast.error("Wall dimensions must be valid positive millimetre values");
      return;
    }

    const newWall: WallWithProducts = {
      id: Date.now().toString(),
      wallType: tempWallType,
      wallName: tempWallName,
      wallWidthMm,
      wallHeightMm,
      obstructionStatus: "none",
      obstructionNotes: "",
      supplyInstallPrice: 0,
      products: [],
    };

    setWallsWithProducts(currentWalls => [newWall, ...currentWalls]);
    setTempWallType("custom");
    setTempWallName("");
    setTempWallWidth("");
    setTempWallHeight("");
    openProductPicker(newWall.id);
    toast.success("Wall added");
  };

  const handleAddProductToWall = (wallId: string) => {
    if (!tempProductType) {
      toast.error("Please select a product");
      return;
    }

    const wall = wallsWithProducts.find(w => w.id === wallId);
    if (!wall) return;

    const requiresCatalogSelection = !["floating_cabinet", "custom_item"].includes(tempProductType);
    const selectedCatalogProduct = requiresCatalogSelection
      ? productsByType?.find((product: any) => product.id.toString() === tempProductId)
      : null;
    const fallbackTvBackdropProduct = tempProductType === "tv_backdrop" ? productsByType?.[0] : null;
    const foundProduct =
      (requiresCatalogSelection
        ? selectedCatalogProduct ?? fallbackTvBackdropProduct
        : tempProductType === "custom_item"
          ? {
              id: 0,
              name: tempCustomItemType,
              pricePerUnit: 0,
              description: "",
              widthMm: undefined,
              heightMm: undefined,
            }
          : {
            id: 0,
            name: "Floating Cabinet - Custom",
            pricePerUnit: 0,
            description: "",
            widthMm: undefined,
            heightMm: undefined,
          }) || null;
    if (tempProductType === "custom_item" && !tempCustomItemType) {
      toast.error("Select a custom item before adding");
      return;
    }
    if (requiresCatalogSelection && !tempProductId) {
      toast.error(tempProductType === "tv_backdrop" ? "Select a marble sheet variant before adding TV Backdrop" : "Please select a product");
      return;
    }
    if (!foundProduct) {
      toast.error(tempProductType === "tv_backdrop" ? "Selected marble sheet variant could not be loaded" : "Product not found");
      return;
    }
    if (tempProductType === "tv_backdrop" && tempProductId !== String(foundProduct.id)) {
      setTempProductId(String(foundProduct.id));
    }

    let newProduct: WallProduct = {
      id: editingProductId || Date.now().toString(),
      productType: tempProductType,
      productId: requiresCatalogSelection ? String(foundProduct.id) : "",
      productName: tempProductType === "tv_backdrop" ? "TV Backdrop" : foundProduct.name,
      catalogProductName: tempProductType === "tv_backdrop" ? foundProduct.name : undefined,
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
        panelWidthMm: foundProduct.widthMm ?? undefined,
        panelHeightMm: foundProduct.heightMm ?? undefined,
        panelCalculation,
        manualReviewRequired: panelCalculation.manualReviewRequired,
        reviewReasons: panelCalculation.reviewReasons,
        internalNotes: panelCalculation.internalNotes,
        customerNotes: panelCalculation.customerNotes,
      };
    }

    if (tempProductType === "acoustic_panel") {
      newProduct = { ...newProduct, acousticFixingMethod: tempAcousticFixingMethod };
    }

    if (tempProductType === "custom_item") {
      const selectedCustomItemType = tempCustomItemType || undefined;
      newProduct = {
        ...newProduct,
        productId: "",
        productName: selectedCustomItemType || "Custom Item",
        customItemType: selectedCustomItemType,
        quantity: 1,
        unitPrice: 0,
      };
    }

    if (tempProductType === "tv_backdrop") {
      const tvSizeInches = Number(tempTvSizeInches);
      const backdropDimensions = getBackdropDimensionsFromCatalogProduct(foundProduct);
      const backdropWidthMm = backdropDimensions?.backdropWidthMm;
      const backdropHeightMm = backdropDimensions?.backdropHeightMm;
      const floatingCabinet = getFloatingCabinetForWall(wallId);
      const tvBottomAfflMm = tempTvBottomAfflMm ? Number(tempTvBottomAfflMm) : undefined;
      const cabinetBottomAfflMm =
        floatingCabinet?.cabinetHeightFromFloorMm !== undefined
          ? floatingCabinet.cabinetHeightFromFloorMm
          : floatingCabinet?.cabinetHeightMm !== undefined
            ? DEFAULT_FLOATING_CABINET_BOTTOM_AFFL_MM
          : tempCabinetHeightFromFloor !== ""
            ? Number(tempCabinetHeightFromFloor)
            : undefined;
      const cabinetHeightMm =
        floatingCabinet?.cabinetHeightMm !== undefined
          ? floatingCabinet.cabinetHeightMm
          : tempCabinetHeight
            ? Number(tempCabinetHeight)
            : undefined;
      const cabinetTopAfflMm =
        cabinetBottomAfflMm !== undefined && cabinetHeightMm !== undefined
          ? cabinetBottomAfflMm + cabinetHeightMm
          : tempCabinetTopAfflMm
            ? Number(tempCabinetTopAfflMm)
            : undefined;
      const cabinetToTvGapMm =
        floatingCabinet && !tempCabinetToTvGapMm
          ? DEFAULT_CABINET_TO_TV_GAP_MM
          : tempCabinetToTvGapMm
            ? Number(tempCabinetToTvGapMm)
            : undefined;
      const hasFloatingCabinet =
        cabinetHeightMm !== undefined &&
        Number.isFinite(cabinetHeightMm) &&
        cabinetHeightMm > 0;
      if (!Number.isFinite(tvSizeInches) || tvSizeInches <= 0) {
        toast.error("Enter TV size in inches before adding TV Backdrop");
        return;
      }
      if (!backdropWidthMm || !backdropHeightMm) {
        toast.error("Selected marble sheet variant is missing standard dimensions");
        return;
      }
      if (floatingCabinet && (!Number.isFinite(cabinetHeightMm) || cabinetHeightMm! <= 0)) {
        toast.error("Enter floating cabinet height before adding TV Backdrop");
        return;
      }
      if (tempTvBottomAfflMm && (!Number.isFinite(tvBottomAfflMm) || tvBottomAfflMm! < 0)) {
        toast.error("Enter a valid TV bottom AFFL before adding TV Backdrop");
        return;
      }
      if (hasFloatingCabinet && (!Number.isFinite(cabinetToTvGapMm) || cabinetToTvGapMm! <= 0)) {
        toast.error("Enter a valid cabinet to TV gap before adding TV Backdrop");
        return;
      }
      newProduct = {
        ...newProduct,
        tvSizeInches,
        backdropWidthMm,
        backdropHeightMm,
        tvBottomAfflMm,
        cabinetHeightFromFloorMm: cabinetBottomAfflMm,
        cabinetHeightMm,
        cabinetTopAfflMm,
        cabinetToTvGapMm,
        includeTvBracket: tempIncludeTvBracket,
      };
    }

    if (["floating_cabinet", "side_tower", "shelving"].includes(tempProductType)) {
      const cabinetWidthMm = Number(tempCabinetWidth);
      const cabinetHeightMm = Number(tempCabinetHeight);
      const cabinetDepthMm = Number(tempCabinetDepth);
      const cabinetHeightFromFloorMm = Number(tempCabinetHeightFromFloor || 0);
      const cabinetSectionWidthsMm = parsePositiveNumberList(tempCabinetSectionWidths);
      const cabinetShelfHeightsBySectionMm = parseShelfHeightsBySection(tempCabinetShelfHeightsBySection);
      if ([cabinetWidthMm, cabinetHeightMm, cabinetDepthMm].some(value => !Number.isFinite(value) || value <= 0)) {
        toast.error("Enter valid cabinet/tower/shelving dimensions before adding");
        return;
      }
      if (tempCabinetSectionWidths.trim()) {
        if (!cabinetSectionWidthsMm.length) {
          toast.error("Enter section widths as comma-separated millimetres");
          return;
        }
        const totalSectionWidthMm = cabinetSectionWidthsMm.reduce((sum, value) => sum + value, 0);
        if (totalSectionWidthMm !== cabinetWidthMm) {
          toast.error(`Section widths must add up to overall width (${cabinetWidthMm} mm)`);
          return;
        }
      }
      if (tempCabinetShelfHeightsBySection.trim() && !tempCabinetSectionWidths.trim()) {
        toast.error("Enter section widths before adding shelf heights by section");
        return;
      }
      if (cabinetShelfHeightsBySectionMm.length > cabinetSectionWidthsMm.length && cabinetSectionWidthsMm.length > 0) {
        toast.error("Shelf section groups cannot exceed the number of cabinet sections");
        return;
      }
      newProduct = {
        ...newProduct,
        cabinetWidthMm,
        cabinetHeightMm,
        cabinetDepthMm,
        cabinetHeightFromFloorMm: Number.isFinite(cabinetHeightFromFloorMm) ? cabinetHeightFromFloorMm : undefined,
        cabinetSectionWidthsMm: cabinetSectionWidthsMm.length ? cabinetSectionWidthsMm : undefined,
        cabinetShelfHeightsBySectionMm: cabinetShelfHeightsBySectionMm.length ? cabinetShelfHeightsBySectionMm : undefined,
        clientPreferenceNotes: tempClientPreferenceNotes.trim() || undefined,
      };
    }

    newProduct = { ...newProduct, itemDetails: buildItemDetails(newProduct) };

    setWallsWithProducts(currentWalls =>
      currentWalls.map(currentWall =>
        currentWall.id === wallId
          ? {
              ...currentWall,
              products: editingProductId
                ? currentWall.products.map(product => (product.id === editingProductId ? newProduct : product))
                : [newProduct, ...currentWall.products],
            }
          : currentWall
      )
    );
    closeProductPicker();
    toast.success(editingProductId ? "Product updated" : "Product added");
  };

  const handleDeleteWall = (wallId: string) => {
    if (activeProductWallId === wallId) closeProductPicker();
    setWallsWithProducts(currentWalls => currentWalls.filter(wall => wall.id !== wallId));
  };

  const handleRemoveProduct = (wallId: string, productId: string) => {
    setWallsWithProducts(currentWalls =>
      currentWalls.map(wall =>
        wall.id === wallId
          ? {
              ...wall,
              products: wall.products.filter(product => product.id !== productId),
            }
          : wall
      )
    );
  };

  const updateWallSupplyInstallPrice = (wallId: string, nextValue: string) => {
    const parsed = Math.round(Math.max(0, Number(nextValue || 0)) * 100);
    setWallsWithProducts(currentWalls =>
      currentWalls.map(wall =>
        wall.id === wallId
          ? { ...wall, supplyInstallPrice: Number.isFinite(parsed) ? parsed : 0 }
          : wall
      )
    );
  };

  const handleSaveDraft = async (requireComplete = false, destination: "stay" | "jobs" | "setout" = "stay") => {
    if (isUploadingImage || uploadImageMutation.isPending) {
      toast.error("Please wait for the reference image upload to finish before saving");
      return;
    }

    if (!hasClientDetails) {
      toast.error(getCustomerIdentifierError({ clientName, clientEmail, clientPhone, clientAddress }));
      setCurrentStep("client");
      return;
    }
    if (requireComplete && !workflowReady) {
      toast.error(
        wallsWithoutPricing.length > 0
          ? "Enter one manual Supply & Install price for each wall before generating the quote"
          : "Complete wall dimensions and products before saving the quote"
      );
      setCurrentStep(wallsWithoutPricing.length > 0 ? "review" : "walls");
      return;
    }

    try {
      const jobInput = {
        clientName: clientName.trim() || clientPhone.trim() || clientEmail.trim() || clientAddress.trim() || "[Draft]",
        clientEmail: clientEmail.trim() || null,
        clientPhone: clientPhone.trim() || null,
        clientAddress: clientAddress.trim() || null,
        suburb: suburb || null,
        appointmentDate: appointmentDate || null,
        appointmentTime: appointmentTime || null,
        referenceImageUrl: referenceImageUrl || null,
        operatorName: getSelectedOperatorName() || null,
        // Guardrail: `totalEstimate` remains the stored field name, but in this
        // workflow it carries the customer-facing total derived from manual wall
        // Supply & Install prices. Do not repurpose it for internal material cost.
        totalEstimate: calculateTotal(),
        notes: encodeQuoteMeta({ customerAddOns }),
      };

      const savedJob = await saveQuoteMutation.mutateAsync({
        ...(resumeJobId ? { id: resumeJobId } : {}),
        ...jobInput,
        walls: wallsWithProducts.map(wall => ({
          wallType: wall.wallType,
          wallName: wall.wallName,
          wallWidthMm: wall.wallWidthMm,
          wallHeightMm: wall.wallHeightMm,
          notes: encodeWallNotes({
            obstructionStatus: wall.obstructionStatus,
            obstructionNotes: wall.obstructionNotes,
            supplyInstallPrice: hasManualWallSupplyInstallPrice(wall) ? wall.supplyInstallPrice : null,
          }),
          products: wall.products.map(product => ({
            itemType: product.productType,
            productId: product.productId ? Number(product.productId) : undefined,
            wallWidthMm: wall.wallWidthMm,
            wallHeightMm: wall.wallHeightMm,
            ...(product.cabinetWidthMm != null ? { cabinetWidthMm: product.cabinetWidthMm } : {}),
            ...(product.cabinetHeightMm != null ? { cabinetHeightMm: product.cabinetHeightMm } : {}),
            ...(product.cabinetDepthMm != null ? { cabinetDepthMm: product.cabinetDepthMm } : {}),
            ...(product.cabinetHeightFromFloorMm != null ? { cabinetHeightFromFloorMm: product.cabinetHeightFromFloorMm } : {}),
            quantityRequired: product.quantity,
            unitPrice: product.unitPrice,
            // Guardrail: this item-level cost data supports internal calculations
            // and operator review only. Customer-facing quote output must not show
            // internal material cost, product-level pricing, labour, margin, or markup.
            totalPrice: product.quantity * product.unitPrice,
            // Guardrail: `itemDetails` is an implicit JSON schema. Serialize it
            // through the typed helpers only so save/resume/PDF remain aligned.
            itemDetails: buildItemDetails(product),
          })),
        })),
      });

      const jobId = savedJob?.id || resumeJobId;
      if (!jobId) throw new Error("Quote could not be saved");

      setResumeJobId(jobId);
      await utils.jobs.list.invalidate();
      const [freshJob, freshWalls] = await Promise.all([
        utils.jobs.getById.fetch({ id: jobId }),
        utils.walls.getByJobId.fetch({ jobId }),
      ]);
      if (freshJob) {
        applySavedJobToForm(freshJob);
      } else {
        applySavedJobToForm(jobInput);
      }
      if (freshWalls) {
        setWallsWithProducts(mapSavedWallsToFormWalls(freshWalls, freshJob?.totalEstimate ?? jobInput.totalEstimate));
      }
      toast.success(requireComplete ? "Quote saved" : "Draft saved");
      if (destination === "setout") {
        navigate(`/setout/${jobId}`);
      } else if (requireComplete || destination === "jobs") {
        navigate("/jobs");
      } else if (!resumeJobId) {
        navigate(`/quote?resumeJobId=${jobId}`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to save quote");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-3 pb-3 pt-14 md:p-6 md:pt-20">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button onClick={() => navigate("/jobs")} disabled={formBusy} variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Quote</h1>
              <p className="text-xs text-gray-600">Client &gt; Walls &gt; Review</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {resumeJobId && (
              <Button onClick={() => navigate(`/setout/${resumeJobId}`)} variant="outline" disabled={formBusy} className="h-9 w-full sm:w-auto">
                <Ruler className="mr-2 h-4 w-4" />
                View Setout
              </Button>
            )}
            <Button onClick={() => handleSaveDraft(false)} variant="outline" disabled={formBusy || !hasClientDetails} className="h-9 w-full sm:w-auto">
              {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
          </div>
        </div>

        <QuoteStepNav
          currentStep={currentStep}
          formBusy={formBusy}
          hasClientDetails={hasClientDetails}
          hasWalls={hasWalls}
          hasProducts={hasProducts}
          workflowReady={workflowReady}
          onStepChange={goToStep}
        />

        {manualReviewItems.length > 0 && currentStep === "review" && (
          <Card className="border-amber-300 bg-amber-50 p-3">
            <div className="flex gap-2 text-sm text-amber-900">
              <FileWarning className="mt-0.5 h-4 w-4 text-amber-700" />
              <p><strong>Manual review required.</strong> Check flagged quantities before relying on the quote.</p>
            </div>
          </Card>
        )}

        {isResumeLoading && (
          <Card className="border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3 text-sm text-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>Loading saved quote details...</p>
            </div>
          </Card>
        )}

        {currentStep === "client" && (
          <QuoteClientStep
            clientName={clientName}
            clientPhone={clientPhone}
            clientAddress={clientAddress}
            suburb={suburb}
            clientEmail={clientEmail}
            appointmentDate={appointmentDate}
            appointmentTime={appointmentTime}
            referenceImagePreview={referenceImagePreview}
            hasClientDetails={hasClientDetails}
            formBusy={formBusy}
            isUploadingImage={isUploadingImage}
            onClientNameChange={setClientName}
            onClientPhoneChange={setClientPhone}
            onClientAddressChange={setClientAddress}
            onSuburbChange={setSuburb}
            onClientEmailChange={setClientEmail}
            onAppointmentDateChange={setAppointmentDate}
            onAppointmentTimeChange={setAppointmentTime}
            onImageUpload={handleImageUpload}
            onClearReferenceImage={() => {
              setReferenceImageUrl("");
              setReferenceImagePreview(null);
            }}
            onContinue={() => goToStep("walls")}
          />
        )}
        {currentStep === "walls" && (
          <QuoteWallsStep
            tempWallType={tempWallType}
            tempWallName={tempWallName}
            tempWallWidth={tempWallWidth}
            tempWallHeight={tempWallHeight}
            formBusy={formBusy}
            wallsWithProducts={wallsWithProducts}
            activeProductWallId={activeProductWallId}
            editingProductId={editingProductId}
            tempProductType={tempProductType}
            tempProductId={tempProductId}
            tempCustomItemType={tempCustomItemType}
            productsByType={productsByType}
            activeWallFloatingCabinet={activeWallFloatingCabinet}
            selectedBackdropDimensions={selectedBackdropDimensions}
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
            reviewReady={reviewReady}
            onTempWallTypeChange={setTempWallType}
            onTempWallNameChange={setTempWallName}
            onTempWallWidthChange={setTempWallWidth}
            onTempWallHeightChange={setTempWallHeight}
            onAddWall={handleAddWall}
            onOpenProductPicker={openProductPicker}
            onDeleteWall={handleDeleteWall}
            onEditProduct={openProductEditor}
            onRemoveProduct={handleRemoveProduct}
            onProductTypeChange={handleProductTypeChange}
            onProductIdChange={setTempProductId}
            onCustomItemTypeChange={value => setTempCustomItemType(value)}
            onSubmitProduct={handleAddProductToWall}
            onCloseProductPicker={closeProductPicker}
            onTempCabinetWidthChange={setTempCabinetWidth}
            onTempCabinetHeightChange={setTempCabinetHeight}
            onTempCabinetDepthChange={setTempCabinetDepth}
            onTempCabinetHeightFromFloorChange={setTempCabinetHeightFromFloor}
            onTempCabinetSectionWidthsChange={setTempCabinetSectionWidths}
            onTempCabinetShelfHeightsBySectionChange={setTempCabinetShelfHeightsBySection}
            onTempClientPreferenceNotesChange={setTempClientPreferenceNotes}
            onTempTvSizeInchesChange={setTempTvSizeInches}
            onTempTvBottomAfflMmChange={setTempTvBottomAfflMm}
            onTempCabinetToTvGapMmChange={setTempCabinetToTvGapMm}
            onTempIncludeTvBracketChange={setTempIncludeTvBracket}
            onTempAcousticFixingMethodChange={setTempAcousticFixingMethod}
            onReview={() => goToStep("review")}
          />
        )}

        {currentStep === "review" && (
          <QuoteReviewStep
            clientName={clientName}
            clientPhone={clientPhone}
            clientEmail={clientEmail}
            clientAddress={clientAddress}
            suburb={suburb}
            wallsWithProducts={wallsWithProducts}
            manualReviewItems={manualReviewItems}
            saveInProgress={saveInProgress}
            workflowReady={workflowReady}
            calculateTotal={calculateTotal}
            materialSummary={materialSummary}
            onUpdateWallSupplyInstallPrice={updateWallSupplyInstallPrice}
            onSaveQuote={() => handleSaveDraft(true, "jobs")}
            onSaveAndViewSetout={() => handleSaveDraft(true, "setout")}
          />
        )}
      </div>
    </div>
  );
}
