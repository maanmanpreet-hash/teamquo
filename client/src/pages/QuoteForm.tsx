"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Loader2,
  Pencil,
  Plus,
  Ruler,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/_core/hooks/useAuth";
import { MaterialSummaryCard } from "@/components/quote/MaterialSummaryCard";
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
import { hasCustomerIdentifier, getCustomerIdentifierError } from "@/lib/customerIdentity";
import { buildQuoteFormMaterialSummary } from "@/lib/quoteMaterialSummary";
import { trpc } from "@/lib/trpc";
import { calculateSheetQuantity } from "@shared/materialIntelligence";
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
  | "marble_sheet"
  | "tv_backdrop"
  | "side_tower"
  | "shelving";

type AcousticFixingMethod = "screws" | "glue" | "screws_and_glue" | "none";

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
  catalogProductName?: string;
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
  cabinetSectionWidthsMm?: number[];
  cabinetShelfHeightsBySectionMm?: number[][];
  clientPreferenceNotes?: string;
  acousticFixingMethod?: AcousticFixingMethod;
  tvSizeInches?: number;
  backdropWidthMm?: number;
  backdropHeightMm?: number;
  tvBottomAfflMm?: number;
  cabinetTopAfflMm?: number;
  cabinetToTvGapMm?: number;
  includeTvBracket?: boolean;
  itemDetails?: string;
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
  tv_backdrop: ["tv_backdrop", "tv-backdrop", "tv-backdrops"],
  side_tower: ["side_tower", "side-tower", "side-towers"],
  shelving: ["shelving", "shelf", "shelves"],
};

const productTypeLabels: Record<ProductTypeSlug, string> = {
  cladding: "Cladding",
  acoustic_panel: "Acoustic Panel",
  floating_cabinet: "Floating Cabinet",
  fireplace: "Fireplace",
  mirror: "Mirror",
  marble_sheet: "Marble Sheet",
  tv_backdrop: "TV Backdrop",
  side_tower: "Side Tower",
  shelving: "Shelving",
};

function formatProductHeading(product: Pick<WallProduct, "productType" | "productName">) {
  const rawName = product.productName?.trim();
  if (!rawName) return productTypeLabels[product.productType];

  const normalized = rawName.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === product.productType) {
    return productTypeLabels[product.productType];
  }

  return rawName;
}

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

function safeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getBackdropDimensionsFromCatalogProduct(product: { widthMm?: number | null; heightMm?: number | null } | null | undefined) {
  const widthMm = safeNumber(product?.widthMm);
  const heightMm = safeNumber(product?.heightMm);
  if (!widthMm || !heightMm) return undefined;

  return widthMm >= heightMm
    ? { backdropWidthMm: widthMm, backdropHeightMm: heightMm }
    : { backdropWidthMm: heightMm, backdropHeightMm: widthMm };
}

function isCompatibleItemDetails(productType: ProductTypeSlug, details: Record<string, any>) {
  if (!details || typeof details !== "object") return false;
  const keys = Object.keys(details);
  if (keys.length === 0) return false;

  const detailType = typeof details.productType === "string" ? details.productType : undefined;
  if (detailType) return detailType === productType;

  if (productType === "tv_backdrop") {
    return ["tvSizeInches", "backdropWidthMm", "backdropHeightMm", "tvBottomAfflMm", "cabinetToTvGapMm"].some(
      key => key in details
    );
  }

  if (["floating_cabinet", "side_tower", "shelving"].includes(productType)) {
    return ["widthMm", "heightMm", "depthMm", "heightFromFloorMm", "clientPreferenceNotes", "sectionWidthsMm", "shelfHeightsBySectionMm"].some(
      key => key in details
    );
  }

  if (productType === "acoustic_panel") {
    return ["fixingMethod", "acousticFixingMethod", "glueTubes", "screws"].some(key => key in details);
  }

  return false;
}

export function getResumeJobIdFromLocation(location: string) {
  const [pathname, queryString = ""] = location.split("?");
  const fallbackQuery = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
  const queryId = new URLSearchParams(queryString || fallbackQuery).get("resumeJobId");
  const pathId = pathname.match(/^\/quote\/(\d+)$/)?.[1];
  const parsed = Number(queryId || pathId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function shouldResetQuoteFormForResumeChange(currentResumeJobId: number | null, nextResumeJobId: number | null) {
  if (currentResumeJobId === nextResumeJobId) return false;
  if (currentResumeJobId === null && nextResumeJobId !== null) return false;
  return true;
}

export function resolveCatalogProductTypeId(
  productType: ProductTypeSlug | null,
  productTypes: Array<{ id: number; slug: string }> | undefined
) {
  if (!productType || !productTypes) return 0;
  const catalogType = productType === "tv_backdrop" ? "marble_sheet" : productType;
  return productTypes.find(type => productTypeSlugAliases[catalogType].includes(type.slug))?.id || 0;
}

function formatDateInput(value: unknown) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function parseItemDetails(value: unknown): Record<string, any> {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parsePositiveNumberList(value: string) {
  return value
    .split(",")
    .map(token => safeNumber(token.trim()))
    .filter((numberValue): numberValue is number => numberValue !== undefined && numberValue > 0);
}

function parseShelfHeightsBySection(value: string) {
  return value
    .split("|")
    .map(sectionValue => parsePositiveNumberList(sectionValue))
    .filter(section => section.length > 0);
}

function formatPositiveNumberList(values: number[] | undefined) {
  return values?.length ? values.map(value => Math.round(value)).join(", ") : "";
}

function formatShelfHeightsBySection(values: number[][] | undefined) {
  return values?.length ? values.map(section => formatPositiveNumberList(section)).join(" | ") : "";
}

function normaliseCabinetBreakdown(sectionWidthsMm: number[] | undefined, shelfHeightsBySectionMm: number[][] | undefined) {
  const normalisedSectionWidths = (sectionWidthsMm || []).filter(value => value > 0);
  const normalisedShelfHeights = (shelfHeightsBySectionMm || [])
    .map(section => section.filter(value => value > 0))
    .filter(section => section.length > 0);

  return {
    sectionWidthsMm: normalisedSectionWidths.length > 0 ? normalisedSectionWidths : undefined,
    shelfHeightsBySectionMm: normalisedShelfHeights.length > 0 ? normalisedShelfHeights : undefined,
  };
}

function calculateTvBackdrop(tvSizeInches: number) {
  const diagonalMm = tvSizeInches * 25.4;
  const ratioDiagonal = Math.sqrt(16 * 16 + 9 * 9);
  const tvWidthMm = Math.round((diagonalMm * 16) / ratioDiagonal);
  const tvHeightMm = Math.round((diagonalMm * 9) / ratioDiagonal);
  const backdropWidthMm = tvWidthMm + 200;
  const backdropHeightMm = tvHeightMm + 200;
  const pvcSheets = calculateSheetQuantity(backdropWidthMm, backdropHeightMm, 1220, 2900);
  const mdfSheets = calculateSheetQuantity(backdropWidthMm, backdropHeightMm, 1220, 2440);

  return {
    tvSizeInches,
    tvWidthMm,
    tvHeightMm,
    backdropWidthMm,
    backdropHeightMm,
    pvcSheets,
    mdfSheets,
    pvcGlueTubes: pvcSheets,
    minimumOverhangEachSideMm: 100,
  };
}

export function buildItemDetails(product: WallProduct) {
  const details: Record<string, any> = {
    productType: product.productType,
  };

  if (product.productType === "acoustic_panel") {
    const fixingMethod = product.acousticFixingMethod || "none";
    details.fixingMethod = fixingMethod;
    details.glueTubes = fixingMethod === "glue" || fixingMethod === "screws_and_glue" ? Math.ceil(product.quantity / 2) : 0;
    details.screws = fixingMethod === "screws" || fixingMethod === "screws_and_glue" ? product.quantity * 9 : 0;
  }

  if (product.productType === "tv_backdrop" && product.tvSizeInches) {
    Object.assign(details, calculateTvBackdrop(product.tvSizeInches));
    details.catalogProductName = product.catalogProductName || product.productName;
    details.backdropWidthMm = product.backdropWidthMm ?? details.backdropWidthMm;
    details.backdropHeightMm = product.backdropHeightMm ?? details.backdropHeightMm;
    details.tvBottomAfflMm = product.tvBottomAfflMm;
    details.cabinetBottomAfflMm = product.cabinetHeightFromFloorMm;
    details.cabinetHeightMm = product.cabinetHeightMm;
    details.cabinetTopAfflMm = product.cabinetTopAfflMm;
    details.cabinetToTvGapMm = product.cabinetToTvGapMm;
    details.includeTvBracket = Boolean(product.includeTvBracket);
  }

  if (["floating_cabinet", "side_tower", "shelving"].includes(product.productType)) {
    const { sectionWidthsMm, shelfHeightsBySectionMm } = normaliseCabinetBreakdown(
      product.cabinetSectionWidthsMm,
      product.cabinetShelfHeightsBySectionMm
    );
    details.widthMm = product.cabinetWidthMm;
    details.heightMm = product.cabinetHeightMm;
    details.depthMm = product.cabinetDepthMm;
    details.heightFromFloorMm = product.cabinetHeightFromFloorMm;
    details.clientPreferenceNotes = product.clientPreferenceNotes;
    details.sectionWidthsMm = sectionWidthsMm;
    details.shelfHeightsBySectionMm = shelfHeightsBySectionMm;
  }

  return JSON.stringify(details);
}

export function applyItemDetailsToProduct(product: WallProduct, itemDetails: unknown): WallProduct {
  const details = parseItemDetails(itemDetails);
  const nextProduct: WallProduct = { ...product, itemDetails: typeof itemDetails === "string" ? itemDetails : undefined };
  if (!isCompatibleItemDetails(product.productType, details)) {
    return nextProduct;
  }

  if (product.productType === "acoustic_panel") {
    nextProduct.acousticFixingMethod = (details.fixingMethod || details.acousticFixingMethod || "none") as AcousticFixingMethod;
  }

  if (product.productType === "tv_backdrop") {
    nextProduct.productName = "TV Backdrop";
    nextProduct.catalogProductName =
      typeof details.catalogProductName === "string" && details.catalogProductName.trim()
        ? details.catalogProductName.trim()
        : product.catalogProductName;
    nextProduct.tvSizeInches = safeNumber(details.tvSizeInches);
    nextProduct.backdropWidthMm = safeNumber(details.backdropWidthMm);
    nextProduct.backdropHeightMm = safeNumber(details.backdropHeightMm);
    nextProduct.tvBottomAfflMm = safeNumber(details.tvBottomAfflMm);
    nextProduct.cabinetHeightFromFloorMm = safeNumber(details.cabinetBottomAfflMm ?? details.heightFromFloorMm);
    nextProduct.cabinetHeightMm = safeNumber(details.cabinetHeightMm ?? details.heightMm);
    nextProduct.cabinetTopAfflMm = safeNumber(details.cabinetTopAfflMm);
    nextProduct.cabinetToTvGapMm = safeNumber(details.cabinetToTvGapMm);
    nextProduct.includeTvBracket = Boolean(details.includeTvBracket);
  }

  if (["floating_cabinet", "side_tower", "shelving"].includes(product.productType)) {
    const sectionWidthsMm = Array.isArray(details.sectionWidthsMm)
      ? details.sectionWidthsMm.map((value: unknown) => safeNumber(value)).filter((value): value is number => value !== undefined && value > 0)
      : undefined;
    const shelfHeightsBySectionMm = Array.isArray(details.shelfHeightsBySectionMm)
      ? details.shelfHeightsBySectionMm
          .map((section: unknown) =>
            Array.isArray(section)
              ? section.map((value: unknown) => safeNumber(value)).filter((value): value is number => value !== undefined && value > 0)
              : []
          )
          .filter(section => section.length > 0)
      : undefined;
    nextProduct.cabinetWidthMm = product.cabinetWidthMm ?? safeNumber(details.widthMm);
    nextProduct.cabinetHeightMm = product.cabinetHeightMm ?? safeNumber(details.heightMm);
    nextProduct.cabinetDepthMm = product.cabinetDepthMm ?? safeNumber(details.depthMm);
    nextProduct.cabinetHeightFromFloorMm = product.cabinetHeightFromFloorMm ?? safeNumber(details.heightFromFloorMm);
    nextProduct.cabinetSectionWidthsMm = sectionWidthsMm;
    nextProduct.cabinetShelfHeightsBySectionMm = shelfHeightsBySectionMm;
    nextProduct.clientPreferenceNotes =
      product.clientPreferenceNotes ?? (typeof details.clientPreferenceNotes === "string" ? details.clientPreferenceNotes : undefined);
  }

  return nextProduct;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mapSavedWallsToFormWalls(savedWalls: any[]): WallWithProducts[] {
  return savedWalls.map((wall: any) => {
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

        return applyItemDetailsToProduct(baseProduct, item.itemDetails);
      }),
    };
  });
}

export default function QuoteForm() {
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
  const [tempWallType, setTempWallType] = useState<"regular" | "garage" | "custom">("custom");
  const [tempWallName, setTempWallName] = useState("");
  const [tempWallWidth, setTempWallWidth] = useState("");
  const [tempWallHeight, setTempWallHeight] = useState("");

  const [activeProductWallId, setActiveProductWallId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [tempProductType, setTempProductType] = useState<ProductTypeSlug | null>(null);
  const [tempProductId, setTempProductId] = useState("");
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
    setTempWallType("custom");
    setTempWallName("");
    setTempWallWidth("");
    setTempWallHeight("");
    setCurrentStep("client");
    closeProductPicker();
  };

  const applySavedJobToForm = (job: any) => {
    setClientName(job.clientName === "[Draft]" ? "" : job.clientName || "");
    setClientEmail(job.clientEmail || "");
    setClientPhone(job.clientPhone || "");
    setClientAddress(job.clientAddress || "");
    setSuburb(job.suburb || "");
    setAppointmentDate(formatDateInput(job.appointmentDate));
    setAppointmentTime(job.appointmentTime || "");
    setReferenceImageUrl(job.referenceImageUrl || "");
    setReferenceImagePreview(job.referenceImageUrl || null);
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
    setWallsWithProducts(mapSavedWallsToFormWalls(savedWalls));
  }, [resumeJobId, savedWalls]);

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
        total + wall.products.reduce((wallTotal, product) => wallTotal + product.quantity * product.unitPrice, 0),
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
  const workflowReady = hasClientDetails && hasWalls && hasProducts && wallsWithoutProducts.length === 0;
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
        : undefined;
    const cabinetHeightMm =
      floatingCabinet.cabinetHeightMm !== undefined ? floatingCabinet.cabinetHeightMm : undefined;
    const cabinetTopAfflMm =
      cabinetBottomAfflMm !== undefined && cabinetHeightMm !== undefined
        ? cabinetBottomAfflMm + cabinetHeightMm
        : undefined;

    setTempCabinetHeightFromFloor(cabinetBottomAfflMm !== undefined ? String(cabinetBottomAfflMm) : "");
    setTempCabinetHeight(cabinetHeightMm !== undefined ? String(cabinetHeightMm) : "");
    setTempCabinetTopAfflMm(cabinetTopAfflMm !== undefined ? String(cabinetTopAfflMm) : "");
  };

  const openProductPicker = (wallId: string) => {
    resetProductDraft();
    setActiveProductWallId(wallId);
  };

  const handleProductTypeChange = (value: ProductTypeSlug) => {
    setTempProductType(value);
    setTempProductId("");
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
            : product.cabinetHeightFromFloorMm;
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
    if (step === "review" && !workflowReady) {
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

    const wallWidthMm = Math.round(Number(tempWallWidth) * 1000);
    const wallHeightMm = Math.round(Number(tempWallHeight) * 1000);
    if (!Number.isFinite(wallWidthMm) || !Number.isFinite(wallHeightMm) || wallWidthMm <= 0 || wallHeightMm <= 0) {
      toast.error("Wall dimensions must be valid positive numbers");
      return;
    }

    setWallsWithProducts(currentWalls => [
      ...currentWalls,
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
    if (!tempProductType) {
      toast.error("Please select a product");
      return;
    }

    const wall = wallsWithProducts.find(w => w.id === wallId);
    if (!wall) return;

    const requiresCatalogSelection = tempProductType !== "floating_cabinet";
    const selectedCatalogProduct = requiresCatalogSelection
      ? productsByType?.find((product: any) => product.id.toString() === tempProductId)
      : null;
    const fallbackTvBackdropProduct = tempProductType === "tv_backdrop" ? productsByType?.[0] : null;
    const foundProduct =
      (requiresCatalogSelection
        ? selectedCatalogProduct ?? fallbackTvBackdropProduct
        : {
            id: 0,
            name: "Floating Cabinet - Custom",
            pricePerUnit: 0,
            description: "",
            widthMm: undefined,
            heightMm: undefined,
          }) || null;
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
      const cabinetToTvGapMm = tempCabinetToTvGapMm ? Number(tempCabinetToTvGapMm) : undefined;
      const hasFloatingCabinet =
        cabinetBottomAfflMm !== undefined &&
        Number.isFinite(cabinetBottomAfflMm) &&
        cabinetHeightMm !== undefined &&
        Number.isFinite(cabinetHeightMm) &&
        cabinetHeightMm > 0;
      const hasPreferredCabinetInputs =
        cabinetBottomAfflMm !== undefined &&
        Number.isFinite(cabinetBottomAfflMm) &&
        cabinetBottomAfflMm >= 0 &&
        Number.isFinite(cabinetHeightMm) &&
        cabinetHeightMm! > 0 &&
        Number.isFinite(cabinetToTvGapMm) &&
        cabinetToTvGapMm! > 0;
      const hasSecondaryCabinetInputs =
        Number.isFinite(cabinetTopAfflMm) &&
        cabinetTopAfflMm! >= 0 &&
        Number.isFinite(cabinetToTvGapMm) &&
        cabinetToTvGapMm! > 0;
      if (!Number.isFinite(tvSizeInches) || tvSizeInches <= 0) {
        toast.error("Enter TV size in inches before adding TV Backdrop");
        return;
      }
      if (!backdropWidthMm || !backdropHeightMm) {
        toast.error("Selected marble sheet variant is missing standard dimensions");
        return;
      }
      if (hasFloatingCabinet && (!Number.isFinite(cabinetToTvGapMm) || cabinetToTvGapMm! <= 0)) {
        toast.error("Enter cabinet to TV gap before adding TV Backdrop");
        return;
      }
      if (!hasFloatingCabinet && (!tvBottomAfflMm || tvBottomAfflMm < 0)) {
        toast.error("Enter TV bottom AFFL before adding TV Backdrop");
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
                : [...currentWall.products, newProduct],
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
        wall.id === wallId ? { ...wall, products: wall.products.filter(product => product.id !== productId) } : wall
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
      toast.error("Complete wall dimensions and products before saving the quote");
      setCurrentStep("walls");
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
        totalEstimate: calculateTotal(),
      };

      const savedJob = await saveQuoteMutation.mutateAsync({
        ...(resumeJobId ? { id: resumeJobId } : {}),
        ...jobInput,
        walls: wallsWithProducts.map(wall => ({
          wallType: wall.wallType,
          wallName: wall.wallName,
          wallWidthMm: wall.wallWidthMm,
          wallHeightMm: wall.wallHeightMm,
          notes: encodeWallNotes(wall.obstructionStatus, wall.obstructionNotes),
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
            totalPrice: product.quantity * product.unitPrice,
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
        setWallsWithProducts(mapSavedWallsToFormWalls(freshWalls));
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
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/jobs")} disabled={formBusy} variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quote</h1>
              <p className="text-xs text-gray-600">Client &gt; Walls &gt; Review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {resumeJobId && (
              <Button onClick={() => navigate(`/setout/${resumeJobId}`)} variant="outline" disabled={formBusy} className="h-9">
                <Ruler className="mr-2 h-4 w-4" />
                View Setout
              </Button>
            )}
            <Button onClick={() => handleSaveDraft(false)} variant="outline" disabled={formBusy || !hasClientDetails} className="h-9">
              {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
          </div>
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
                  disabled={formBusy}
                  onClick={() => goToStep(step.id)}
                  className={`rounded-md border px-2 py-2 text-left text-sm transition ${
                    active ? "border-blue-500 bg-blue-50" : complete ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                  } ${formBusy ? "cursor-not-allowed opacity-60" : ""}`}
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

        {isResumeLoading && (
          <Card className="border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3 text-sm text-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>Loading saved quote details...</p>
            </div>
          </Card>
        )}

        {currentStep === "client" && (
          <Card className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
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
                    disabled={formBusy}
                    onClick={() => {
                      setReferenceImageUrl("");
                      setReferenceImagePreview(null);
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    x
                  </button>
                </div>
              )}
            </div>

              <Button onClick={() => goToStep("walls")} disabled={!hasClientDetails || formBusy} className="h-10 w-full">
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
              <Button onClick={handleAddWall} disabled={formBusy} className="h-10 w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Add Wall</Button>
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
                        <Button onClick={() => openProductPicker(wall.id)} disabled={formBusy} variant="outline" size="sm" className="h-8">
                          <Plus className="mr-1 h-3 w-3" />Product
                        </Button>
                      )}
                      <Button onClick={() => handleDeleteWall(wall.id)} disabled={formBusy} variant="ghost" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {wall.products.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      {wall.products.map(product => (
                        <div key={product.id} className="rounded-lg bg-gray-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{formatProductHeading(product)}</p>
                              <p className="text-sm text-gray-600">Qty {product.quantity} x {formatMoney(product.unitPrice)} = {formatMoney(product.quantity * product.unitPrice)}</p>
                              {product.productType === "tv_backdrop" && product.catalogProductName && (
                                <p className="text-xs text-gray-600">Marble sheet: {product.catalogProductName}</p>
                              )}
                              {product.productType === "tv_backdrop" && product.tvSizeInches && <p className="text-xs text-gray-600">TV size: {product.tvSizeInches}&quot;</p>}
                              {product.productType === "tv_backdrop" && product.backdropWidthMm && product.backdropHeightMm && (
                                <p className="text-xs text-gray-600">
                                  Backdrop: {product.backdropWidthMm} x {product.backdropHeightMm} mm
                                </p>
                              )}
                              {product.productType === "tv_backdrop" && product.tvBottomAfflMm && (
                                <p className="text-xs text-gray-600">TV bottom AFFL: {product.tvBottomAfflMm} mm</p>
                              )}
                              {product.productType === "tv_backdrop" && product.cabinetHeightFromFloorMm !== undefined && product.cabinetHeightMm && (
                                <p className="text-xs text-gray-600">
                                  Cabinet bottom AFFL: {product.cabinetHeightFromFloorMm} mm, height: {product.cabinetHeightMm} mm
                                </p>
                              )}
                              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                                product.cabinetWidthMm &&
                                product.cabinetHeightMm &&
                                product.cabinetDepthMm && (
                                  <p className="text-xs text-gray-600">
                                    Size: {product.cabinetWidthMm} W x {product.cabinetHeightMm} H x {product.cabinetDepthMm} D mm
                                  </p>
                                )}
                              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                                product.cabinetHeightFromFloorMm !== undefined && (
                                  <p className="text-xs text-gray-600">
                                    From floor: {product.cabinetHeightFromFloorMm} mm
                                  </p>
                                )}
                              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                                product.cabinetSectionWidthsMm?.length && (
                                  <p className="text-xs text-gray-600">
                                    Sections: {formatPositiveNumberList(product.cabinetSectionWidthsMm)} mm
                                  </p>
                                )}
                              {["floating_cabinet", "side_tower", "shelving"].includes(product.productType) &&
                                product.cabinetShelfHeightsBySectionMm?.length && (
                                  <p className="text-xs text-gray-600">
                                    Shelves by section: {formatShelfHeightsBySection(product.cabinetShelfHeightsBySectionMm)} mm
                                  </p>
                                )}
                              {product.productType === "floating_cabinet" && product.clientPreferenceNotes && (
                                <p className="text-xs text-gray-600">Client preference: {product.clientPreferenceNotes}</p>
                              )}
                              {product.productType === "tv_backdrop" && product.cabinetTopAfflMm && product.cabinetToTvGapMm && (
                                <p className="text-xs text-gray-600">
                                  Cabinet top AFFL: {product.cabinetTopAfflMm} mm, gap: {product.cabinetToTvGapMm} mm
                                </p>
                              )}
                              {product.productType === "tv_backdrop" && product.includeTvBracket && <p className="text-xs text-gray-600">TV bracket: included internally</p>}
                              {product.productType === "acoustic_panel" && product.acousticFixingMethod && product.acousticFixingMethod !== "none" && <p className="text-xs text-gray-600">Fixing: {product.acousticFixingMethod.replace(/_/g, " ")}</p>}
                              {product.manualReviewRequired && <p className="text-xs font-semibold text-amber-700">Manual review required</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => openProductEditor(wall.id, product)}
                                disabled={formBusy}
                                variant="ghost"
                                size="sm"
                                className="text-gray-600"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => handleRemoveProduct(wall.id, product.id)} disabled={formBusy} variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                            </div>
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
                          <Select
                            value={tempProductType || ""}
                            onValueChange={value => handleProductTypeChange(value as ProductTypeSlug)}
                          >
                            <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(productTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {tempProductType && tempProductType !== "floating_cabinet" && (
                          <div>
                            <Label>{tempProductType === "tv_backdrop" ? "Marble Sheet Variant *" : "Product *"}</Label>
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
                          <Button onClick={() => handleAddProductToWall(wall.id)} disabled={formBusy} className="h-10 flex-1">
                            {editingProductId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                            {editingProductId ? "Save" : "Add"}
                          </Button>
                          <Button onClick={closeProductPicker} disabled={formBusy} type="button" variant="outline" className="h-10">Cancel</Button>
                        </div>
                      </div>

                      {(["floating_cabinet", "side_tower", "shelving"].includes(tempProductType || "")) && (
                        <div className="space-y-3 rounded-lg border bg-white p-3">
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            <div>
                              <Label htmlFor="customWidthMm">Width mm *</Label>
                              <Input id="customWidthMm" type="number" value={tempCabinetWidth} onChange={e => setTempCabinetWidth(e.target.value)} placeholder="2100" className="mt-1 h-10" />
                            </div>
                            <div>
                              <Label htmlFor="customHeightMm">Height mm *</Label>
                              <Input id="customHeightMm" type="number" value={tempCabinetHeight} onChange={e => setTempCabinetHeight(e.target.value)} placeholder="450" className="mt-1 h-10" />
                            </div>
                            <div>
                              <Label htmlFor="customDepthMm">Depth mm *</Label>
                              <Input id="customDepthMm" type="number" value={tempCabinetDepth} onChange={e => setTempCabinetDepth(e.target.value)} placeholder="360" className="mt-1 h-10" />
                            </div>
                            <div>
                              <Label htmlFor="customAfflMm">Bottom from floor mm</Label>
                              <Input id="customAfflMm" type="number" value={tempCabinetHeightFromFloor} onChange={e => setTempCabinetHeightFromFloor(e.target.value)} placeholder="0" className="mt-1 h-10" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <Label htmlFor="cabinetSectionWidths">Section widths mm</Label>
                              <Input
                                id="cabinetSectionWidths"
                                value={tempCabinetSectionWidths}
                                onChange={e => setTempCabinetSectionWidths(e.target.value)}
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
                                value={tempCabinetShelfHeightsBySection}
                                onChange={e => setTempCabinetShelfHeightsBySection(e.target.value)}
                                placeholder="230 | 230, 460 |"
                                className="mt-1 h-10"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Optional. Use `|` between sections and commas within each section.
                              </p>
                            </div>
                          </div>
                          {tempProductType === "floating_cabinet" && (
                            <div>
                              <Label htmlFor="floatingCabinetNotes">Client preference notes</Label>
                              <textarea
                                id="floatingCabinetNotes"
                                value={tempClientPreferenceNotes}
                                onChange={e => setTempClientPreferenceNotes(e.target.value)}
                                placeholder="Optional finish, handle, profile, colour, or other client preference"
                                className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {tempProductType === "tv_backdrop" && (
                        <div className="space-y-3 rounded-lg border bg-white p-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <Label>TV Size inches *</Label>
                              <Input
                                type="number"
                                value={tempTvSizeInches}
                                onChange={e => setTempTvSizeInches(e.target.value)}
                                placeholder="75"
                                className="mt-1 h-10"
                              />
                            </div>
                            {!activeWallFloatingCabinet && (
                              <div>
                              <Label>TV Bottom AFFL mm *</Label>
                              <Input
                                type="number"
                                value={tempTvBottomAfflMm}
                                onChange={e => setTempTvBottomAfflMm(e.target.value)}
                                placeholder="700"
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
                              value={tempCabinetToTvGapMm}
                              onChange={e => setTempCabinetToTvGapMm(e.target.value)}
                              placeholder="250"
                              className="mt-1 h-10"
                            />
                          </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={tempIncludeTvBracket}
                              onChange={event => setTempIncludeTvBracket(event.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            TV Bracket
                          </label>
                        </div>
                      )}

                      {tempProductType === "acoustic_panel" && (
                        <div className="rounded-lg border bg-white p-3">
                          <Label>Fixing Method</Label>
                          <Select value={tempAcousticFixingMethod} onValueChange={value => setTempAcousticFixingMethod(value as AcousticFixingMethod)}>
                            <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="screws">Screws</SelectItem>
                              <SelectItem value="glue">Glue</SelectItem>
                              <SelectItem value="screws_and_glue">Screws + Glue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            <Button onClick={() => goToStep("review")} disabled={!workflowReady || formBusy} className="h-10 w-full">Review Quote</Button>
          </div>
        )}

        {currentStep === "review" && (
          <div className="space-y-4">
            <Card className="space-y-4 p-4">
              <h2 className="text-lg font-semibold">Review Quote</h2>
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div>Client: <span className="font-medium">{clientName || "Not provided"}</span></div>
                <div>Phone: <span className="font-medium">{clientPhone || "Not provided"}</span></div>
                <div>Email: <span className="font-medium">{clientEmail || "Not provided"}</span></div>
                <div>Address: <span className="font-medium">{clientAddress || "Not provided"}</span></div>
                <div>Suburb: <span className="font-medium">{suburb || "Not provided"}</span></div>
              </div>

              <div className="space-y-3">
                {wallsWithProducts.map(wall => (
                  <div key={wall.id} className="rounded-lg border p-3">
                    <h4 className="font-semibold">{wall.wallName} ({formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)})</h4>
                    <div className="mt-2 space-y-2">
                      {wall.products.map(product => (
                        <div key={product.id} className="flex justify-between gap-3 text-sm">
                          <span>Supply and install {formatProductHeading(product)}</span>
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
                    {manualReviewItems.map(({ wall, product }) => <li key={`${wall.id}-${product.id}`}>{wall.wallName} - {formatProductHeading(product)}</li>)}
                  </ul>
                </div>
              )}

              <div className="text-right"><p className="text-2xl font-bold">Total: {formatMoney(calculateTotal())}</p></div>
                          <Button onClick={() => handleSaveDraft(true, "jobs")} className="h-10 w-full" disabled={saveInProgress || !workflowReady}>
                            {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Quote
                          </Button>
                          <Button
                            onClick={() => handleSaveDraft(true, "setout")}
                            variant="outline"
                            className="h-10 w-full"
                            disabled={saveInProgress || !workflowReady}
                          >
                            {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save + View Setout
                          </Button>
            </Card>

            <MaterialSummaryCard summary={materialSummary} />
          </div>
        )}
      </div>
    </div>
  );
}
