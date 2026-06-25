import type { CustomItemOption, ProductTypeSlug, WallProduct } from "./types";
import { customItemOptions } from "./types";
import { safeNumber } from "./formatters";
import { calculateTvBackdrop } from "./tvBackdropForm";

// Guardrail: `itemDetails` is an implicit JSON payload shared across UI, save/load,
// and document generation. Product-specific fields should be parsed and serialized
// through these helpers only, rather than via ad-hoc JSON handling in components.
export function parseItemDetails(value: unknown): Record<string, any> {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function isCompatibleItemDetails(productType: ProductTypeSlug, details: Record<string, any>) {
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

  if (productType === "custom_item") {
    return ["customItemType", "customItemLabel"].some(key => key in details);
  }

  return false;
}

export function parsePositiveNumberList(value: string) {
  return value
    .split(",")
    .map(token => safeNumber(token.trim()))
    .filter((numberValue): numberValue is number => numberValue !== undefined && numberValue > 0);
}

export function parseShelfHeightsBySection(value: string) {
  return value
    .split("|")
    .map(sectionValue => parsePositiveNumberList(sectionValue))
    .filter(section => section.length > 0);
}

export function formatPositiveNumberList(values: number[] | undefined) {
  return values?.length ? values.map(value => Math.round(value)).join(", ") : "";
}

export function formatShelfHeightsBySection(values: number[][] | undefined) {
  return values?.length ? values.map(section => formatPositiveNumberList(section)).join(" | ") : "";
}

export function normaliseCabinetBreakdown(sectionWidthsMm: number[] | undefined, shelfHeightsBySectionMm: number[][] | undefined) {
  const normalisedSectionWidths = (sectionWidthsMm || []).filter(value => value > 0);
  const normalisedShelfHeights = (shelfHeightsBySectionMm || [])
    .map(section => section.filter(value => value > 0))
    .filter(section => section.length > 0);

  return {
    sectionWidthsMm: normalisedSectionWidths.length > 0 ? normalisedSectionWidths : undefined,
    shelfHeightsBySectionMm: normalisedShelfHeights.length > 0 ? normalisedShelfHeights : undefined,
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
    details.onsiteCarryoverNotes = product.onsiteCarryoverNotes;
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
    details.onsiteCarryoverNotes = product.onsiteCarryoverNotes;
    details.sectionWidthsMm = sectionWidthsMm;
    details.shelfHeightsBySectionMm = shelfHeightsBySectionMm;
  }

  if (product.productType === "custom_item") {
    details.customItemType = product.customItemType;
    details.customItemLabel = product.productName;
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
    nextProduct.acousticFixingMethod = (details.fixingMethod || details.acousticFixingMethod || "none") as WallProduct["acousticFixingMethod"];
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
    nextProduct.onsiteCarryoverNotes =
      typeof details.onsiteCarryoverNotes === "string" ? details.onsiteCarryoverNotes : undefined;
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
    nextProduct.onsiteCarryoverNotes =
      typeof details.onsiteCarryoverNotes === "string" ? details.onsiteCarryoverNotes : undefined;
  }

  if (product.productType === "custom_item") {
    nextProduct.customItemType =
      customItemOptions.find(option => option === details.customItemType) ||
      customItemOptions.find(option => option === details.customItemLabel) ||
      undefined;
    nextProduct.productName =
      typeof details.customItemLabel === "string" && details.customItemLabel.trim()
        ? details.customItemLabel.trim()
        : nextProduct.customItemType || product.productName;
  }

  return nextProduct;
}
