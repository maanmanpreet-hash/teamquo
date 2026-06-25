import {
  buildItemDetails,
} from "@/lib/quote/itemDetails";
import type { WallProduct, WallWithProducts, WorkflowStep } from "@/lib/quote/types";

import type { OnsiteDraftRecord, OnsiteDraftSnapshot } from "./onsiteDrafts";

export interface QuoteSeedFromOnsite {
  currentStep: WorkflowStep;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  suburb: string;
  appointmentDate: string;
  appointmentTime: string;
  referenceImageUrl: string;
  wallsWithProducts: WallWithProducts[];
}

function parsePositiveInt(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function joinNoteLines(lines: Array<[string, string | undefined]>) {
  return lines
    .filter(([, value]) => Boolean(value && value.trim()))
    .map(([label, value]) => `${label}: ${value!.trim()}`)
    .join("\n");
}

function buildWallNotes(snapshot: OnsiteDraftSnapshot) {
  return joinNoteLines([
    ["Wall notes", snapshot.wallNotes],
    ["Stud wall notes", snapshot.studWallNotes],
    ["Obstruction notes", snapshot.obstructionNotes],
    ["Power point notes", snapshot.powerpointNotes],
    ["Ceiling height", snapshot.ceilingHeightMm ? `${snapshot.ceilingHeightMm} mm` : undefined],
    ["Cladding type", snapshot.claddingType],
    ["Material notes", snapshot.materialNotes],
    ["Installer notes", snapshot.installerNotes],
    ["Photo reference notes", snapshot.photoReferenceNotes],
  ]);
}

function createPlaceholderProduct(product: WallProduct): WallProduct {
  return { ...product, itemDetails: buildItemDetails(product) };
}

function maybeCreateTvBackdrop(snapshot: OnsiteDraftSnapshot) {
  const tvSizeInches = parsePositiveInt(snapshot.tvSizeInches);
  const backdropWidthMm = parsePositiveInt(snapshot.backdropWidthMm);
  const backdropHeightMm = parsePositiveInt(snapshot.backdropHeightMm);
  const carryover = joinNoteLines([
    ["TV model", snapshot.tvModel],
    ["VESA notes", snapshot.vesaNotes],
    ["Desired TV centre height", snapshot.desiredTvCentreHeightMm ? `${snapshot.desiredTvCentreHeightMm} mm` : undefined],
  ]);

  if (!tvSizeInches && !backdropWidthMm && !backdropHeightMm && !carryover) return undefined;

  return createPlaceholderProduct({
    id: `onsite-tv-${Date.now()}`,
    productType: "tv_backdrop",
    productId: "",
    productName: "TV Backdrop",
    quantity: 1,
    unitPrice: 0,
    tvSizeInches,
    backdropWidthMm,
    backdropHeightMm,
    onsiteCarryoverNotes: carryover || undefined,
  });
}

function maybeCreateFloatingCabinet(snapshot: OnsiteDraftSnapshot) {
  const width = parsePositiveInt(snapshot.floatingCabinetWidthMm);
  const height = parsePositiveInt(snapshot.floatingCabinetHeightMm);
  const depth = parsePositiveInt(snapshot.floatingCabinetDepthMm);
  const bottom = parsePositiveInt(snapshot.floatingCabinetBottomFromFloorMm);
  const carryover = joinNoteLines([
    ["Cabinet source", "Onsite draft"],
    ["TV model", snapshot.tvModel],
    ["VESA notes", snapshot.vesaNotes],
  ]);

  if (!width && !height && !depth && !bottom && !carryover) return undefined;

  return createPlaceholderProduct({
    id: `onsite-cabinet-${Date.now()}`,
    productType: "floating_cabinet",
    productId: "",
    productName: "Floating Cabinet",
    quantity: 1,
    unitPrice: 0,
    cabinetWidthMm: width,
    cabinetHeightMm: height,
    cabinetDepthMm: depth,
    cabinetHeightFromFloorMm: bottom,
    clientPreferenceNotes: carryover || undefined,
  });
}

function maybeCreateSideTower(snapshot: OnsiteDraftSnapshot, side: "left" | "right") {
  const enabled = side === "left" ? snapshot.sideTowerLeftEnabled : snapshot.sideTowerRightEnabled;
  const width = parsePositiveInt(side === "left" ? snapshot.sideTowerLeftWidthMm : snapshot.sideTowerRightWidthMm);
  const height = parsePositiveInt(side === "left" ? snapshot.sideTowerLeftHeightMm : snapshot.sideTowerRightHeightMm);
  const depth = parsePositiveInt(side === "left" ? snapshot.sideTowerLeftDepthMm : snapshot.sideTowerRightDepthMm);
  if (!enabled && !width && !height && !depth) return undefined;

  return createPlaceholderProduct({
    id: `onsite-side-${side}-${Date.now()}`,
    productType: "side_tower",
    productId: "",
    productName: "Side Tower",
    quantity: 1,
    unitPrice: 0,
    cabinetWidthMm: width,
    cabinetHeightMm: height,
    cabinetDepthMm: depth,
    clientPreferenceNotes: `${side === "left" ? "Left" : "Right"} side tower from onsite draft`,
  });
}

export function mapOnsiteDraftToQuoteSeed(record: OnsiteDraftRecord): QuoteSeedFromOnsite {
  const { snapshot } = record;
  const wallWidthMm = parsePositiveInt(snapshot.wallWidthMm) ?? 1;
  const wallHeightMm = parsePositiveInt(snapshot.wallHeightMm) ?? 1;
  const wallNotes = buildWallNotes(snapshot);

  const products = [
    maybeCreateTvBackdrop(snapshot),
    maybeCreateFloatingCabinet(snapshot),
    maybeCreateSideTower(snapshot, "left"),
    maybeCreateSideTower(snapshot, "right"),
  ].filter((product): product is WallProduct => Boolean(product));

  const wall: WallWithProducts = {
    id: `onsite-wall-${record.localOnsiteDraftId}`,
    wallType: "custom",
    wallName: snapshot.roomName.trim() || "Onsite Wall",
    wallWidthMm,
    wallHeightMm,
    obstructionStatus:
      snapshot.obstructionNotes.trim() || snapshot.powerpointNotes.trim()
        ? "present"
        : wallNotes
          ? "unknown"
          : "none",
    obstructionNotes: wallNotes,
    supplyInstallPrice: 0,
    products,
  };

  return {
    currentStep: "walls",
    clientName: snapshot.customerName,
    clientPhone: snapshot.customerPhone,
    clientEmail: snapshot.customerEmail,
    clientAddress: snapshot.siteAddress,
    suburb: snapshot.suburb,
    appointmentDate: "",
    appointmentTime: "",
    referenceImageUrl: "",
    wallsWithProducts: [wall],
  };
}
