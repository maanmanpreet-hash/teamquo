import type { ElevationDocument } from "./elevationScene";
import { createFloatingCabinetElevationDocument, createTvWallInstallerElevationDocument } from "./elevationPresets";
import { formatQuoteNumber } from "./quote";
import { calculateTvBackdropSetout } from "./tvSetout";
import type { TvBackdropSetoutDocument } from "./tvSetoutDocument";

export type ElevationDocumentRecord = {
  id: string;
  selectorLabel: string;
  fileName: string;
  emptyStateHint: string;
  document: ElevationDocument;
  documentType: "tv_installer_setout" | "cabinet_production";
};

type WallProductLike = {
  id: string | number;
  itemType: string;
  cabinetWidthMm?: unknown;
  cabinetHeightMm?: unknown;
  cabinetDepthMm?: unknown;
  cabinetHeightFromFloorMm?: unknown;
  itemDetails?: unknown;
};

type WallLike = {
  id: string | number;
  wallName?: string | null;
  wallWidthMm?: unknown;
  wallHeightMm?: unknown;
  products?: WallProductLike[] | null;
};

type JobLike = {
  clientName?: string | null;
} & Record<string, unknown>;

function getProducts(products: WallLike["products"]): WallProductLike[] {
  return Array.isArray(products) ? products : [];
}

function parseItemDetails(value: unknown): Record<string, any> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "setout";
}

function buildTvSetoutRecord(args: {
  job: JobLike;
  wall: WallLike;
  product: WallProductLike;
  backdropIndex: number;
  floatingCabinet?: WallProductLike;
  generatedDateLabel: string;
}): ElevationDocumentRecord[] {
  const { job, wall, product, backdropIndex, floatingCabinet, generatedDateLabel } = args;
  const floatingCabinetBottomAfflMm = safeNumber(floatingCabinet?.cabinetHeightFromFloorMm);
  const floatingCabinetHeightMm = safeNumber(floatingCabinet?.cabinetHeightMm);
  const floatingCabinetDetails = parseItemDetails(floatingCabinet?.itemDetails);
  const floatingCabinetSectionWidthsMm = Array.isArray(floatingCabinetDetails.sectionWidthsMm)
    ? floatingCabinetDetails.sectionWidthsMm
        .map((value: unknown) => safeNumber(value))
        .filter((value): value is number => value !== undefined && value > 0)
    : undefined;
  const cabinetTopFromCabinet =
    floatingCabinetBottomAfflMm !== undefined && floatingCabinetHeightMm !== undefined
      ? floatingCabinetBottomAfflMm + floatingCabinetHeightMm
      : undefined;

  const details = parseItemDetails(product.itemDetails);
  const tvSizeInches = safeNumber(details.tvSizeInches);
  const backdropWidthMm = safeNumber(details.backdropWidthMm ?? details.backdrop_width_mm);
  const backdropHeightMm = safeNumber(details.backdropHeightMm ?? details.backdrop_height_mm);
  const tvBottomAfflMm = safeNumber(details.tvBottomAfflMm ?? details.tv_bottom_affl_mm);
  const cabinetBottomAfflMm =
    floatingCabinetBottomAfflMm ??
    safeNumber(details.cabinetBottomAfflMm ?? details.cabinet_bottom_affl_mm ?? details.heightFromFloorMm);
  const cabinetHeightMm =
    floatingCabinetHeightMm ??
    safeNumber(details.cabinetHeightMm ?? details.cabinet_height_mm ?? details.heightMm);
  const cabinetTopAfflMm =
    cabinetTopFromCabinet ??
    safeNumber(details.cabinetTopAfflMm ?? details.cabinet_top_affl_mm);
  const cabinetToTvGapMm = safeNumber(details.cabinetToTvGapMm ?? details.cabinet_to_tv_gap_mm);
  const wallWidthMm = safeNumber(wall.wallWidthMm);
  const wallHeightMm = safeNumber(wall.wallHeightMm);

  if (!tvSizeInches || !backdropWidthMm || !backdropHeightMm || !wallWidthMm || !wallHeightMm) {
    return [];
  }

  try {
    const setout = calculateTvBackdropSetout({
      wallWidthMm,
      wallHeightMm,
      tvSizeInches,
      backdropWidthMm,
      backdropHeightMm,
      tvBottomAfflMm,
      cabinetBottomAfflMm,
      cabinetHeightMm,
      cabinetTopAfflMm,
      cabinetToTvGapMm,
    });

    const tvDocument: TvBackdropSetoutDocument = {
      quoteNumber: formatQuoteNumber(job as any),
      clientName: job.clientName === "[Draft]" ? "Draft Quote" : String(job.clientName || "Draft Quote"),
      wallName: wall.wallName || "TV Wall",
      generatedDateLabel,
      cabinetWidthMm: safeNumber(floatingCabinet?.cabinetWidthMm),
      cabinetHeightMm: setout.cabinetHeightMm,
      cabinetHeightFromFloorMm: setout.cabinetBottomAfflMm,
      cabinetSectionWidthsMm: floatingCabinetSectionWidthsMm,
      setout,
    };

    const selectorLabel = `${wall.wallName || "TV Wall"}${backdropIndex > 1 ? ` - TV Backdrop ${backdropIndex}` : ""}`;
    const fileRoot = sanitizeFilePart(`${tvDocument.quoteNumber}-${tvDocument.wallName}-tv-backdrop-setout`);

    return [
      {
        id: `${wall.id}-${product.id}-tv`,
        selectorLabel: `${selectorLabel} - TV Installer Setout`,
        fileName: `${fileRoot}.pdf`,
        emptyStateHint: "Save a TV backdrop on the selected wall with its install inputs to generate the installer setout.",
        document: createTvWallInstallerElevationDocument(tvDocument),
        documentType: "tv_installer_setout",
      },
    ];
  } catch {
    return [];
  }
}

function buildCabinetElevationRecord(args: {
  job: JobLike;
  wall: WallLike;
  product: WallProductLike;
  productIndex: number;
}): ElevationDocumentRecord[] {
  const { job, wall, product, productIndex } = args;
  const details = parseItemDetails(product.itemDetails);
  const widthMm = safeNumber(product.cabinetWidthMm ?? details.widthMm);
  const heightMm = safeNumber(product.cabinetHeightMm ?? details.heightMm);
  const depthMm = safeNumber(product.cabinetDepthMm ?? details.depthMm);
  const heightFromFloorMm = safeNumber(product.cabinetHeightFromFloorMm ?? details.heightFromFloorMm) ?? 0;
  const sectionWidths = Array.isArray(details.sectionWidthsMm)
    ? details.sectionWidthsMm.map((value: unknown) => safeNumber(value)).filter((value): value is number => value !== undefined)
    : [];
  const shelfHeightsBySection = Array.isArray(details.shelfHeightsBySectionMm) ? details.shelfHeightsBySectionMm : [];
  const sections =
    sectionWidths.length > 0
      ? sectionWidths.map((sectionWidth, index) => ({
          widthMm: sectionWidth,
          shelfHeightsMm: Array.isArray(shelfHeightsBySection[index])
            ? shelfHeightsBySection[index]
                .map((value: unknown) => safeNumber(value))
                .filter((value): value is number => value !== undefined)
            : [],
        }))
      : undefined;

  if (!widthMm || !heightMm || !depthMm) {
    return [];
  }

  const productTypeLabel =
    product.itemType === "side_tower"
      ? "Side Tower"
      : product.itemType === "shelving"
        ? "Shelving"
        : "Floating Cabinet";
  const itemName = productIndex > 1 ? `${wall.wallName || "Wall"} ${productTypeLabel} ${productIndex}` : `${wall.wallName || "Wall"} ${productTypeLabel}`;
  const fileRoot = sanitizeFilePart(`${formatQuoteNumber(job as any)}-${itemName}-cabinet-elevation`);

  try {
    return [
      {
        id: `${wall.id}-${product.id}-${product.itemType}`,
        selectorLabel: `${itemName} - Cabinet Elevation`,
        fileName: `${fileRoot}.pdf`,
        emptyStateHint: "Save cabinet width, height, depth, and height-from-floor on the wall item to generate a cabinet elevation.",
        document: createFloatingCabinetElevationDocument({
          quoteNumber: formatQuoteNumber(job as any),
          clientName: job.clientName === "[Draft]" ? "Draft Quote" : String(job.clientName || "Draft Quote"),
          itemName,
          widthMm,
          heightMm,
          depthMm,
          heightFromFloorMm,
          sections,
        }),
        documentType: "cabinet_production",
      },
    ];
  } catch {
    return [];
  }
}

export function buildElevationDocuments(job: JobLike, walls: WallLike[], generatedDateLabel = new Date().toLocaleDateString()) {
  const records = walls.flatMap(wall => {
    try {
      const products = getProducts(wall.products);
      const floatingCabinet = products.find(product => product.itemType === "floating_cabinet");
      let backdropIndex = 0;
      let cabinetIndex = 0;

      return products.flatMap(product => {
        if (product.itemType === "tv_backdrop") {
          backdropIndex += 1;
          return buildTvSetoutRecord({ job, wall, product, backdropIndex, floatingCabinet, generatedDateLabel });
        }

        if (["floating_cabinet", "side_tower", "shelving"].includes(product.itemType)) {
          cabinetIndex += 1;
          return buildCabinetElevationRecord({ job, wall, product, productIndex: cabinetIndex });
        }

        return [];
      });
    } catch {
      return [];
    }
  });

  return records.sort((left, right) => {
    const priority = (record: ElevationDocumentRecord) => (record.documentType === "tv_installer_setout" ? 0 : 1);
    return priority(left) - priority(right) || left.selectorLabel.localeCompare(right.selectorLabel);
  });
}
