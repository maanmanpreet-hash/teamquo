export type QuoteProductType =
  | "cladding"
  | "acoustic_panel"
  | "floating_cabinet"
  | "fireplace"
  | "mirror"
  | "marble_sheet"
  | "tv_backdrop"
  | "side_tower"
  | "shelving";

export type AcousticFixingMethod = "screws" | "glue" | "screws_and_glue" | "none";

export interface ProductSelectionForMaterials {
  productType: QuoteProductType;
  productName: string;
  quantity: number;
  unitCostCents?: number;
  acousticFixingMethod?: AcousticFixingMethod;
  tvSizeInches?: number;
}

export interface WallForMaterials {
  wallName: string;
  wallWidthMm: number;
  wallHeightMm: number;
  products: ProductSelectionForMaterials[];
}

export interface MaterialLine {
  key: string;
  name: string;
  quantity: number;
  unitCostCents?: number;
  source: "automatic" | "operator_selected" | "reference_only";
  notes?: string[];
}

export interface MaterialEstimate {
  wallName: string;
  lines: MaterialLine[];
  referenceCostCents: number;
  notes: string[];
}

export interface TvDimensions {
  diagonalInches: number;
  widthMm: number;
  heightMm: number;
}

export interface TvBackdropDimensions extends TvDimensions {
  backdropWidthMm: number;
  backdropHeightMm: number;
}

export const TV_BACKDROP_EXTENSION_MM = 100;
export const ACOUSTIC_SCREWS_PER_PANEL = 9;
export const ACOUSTIC_GLUE_PANEL_RATIO = 2;

export const MATERIAL_BASELINES = {
  pvcMarbleSheet: {
    name: "PVC Marble Sheet 1220x3x2900mm",
    widthMm: 1220,
    heightMm: 2900,
    thicknessMm: 3,
    unitCostCents: 5909,
  },
  highTackGlue: {
    name: "High Tack Glue",
    unitCostCents: 728,
  },
  acousticSlatPanel: {
    name: "Acoustic Slat Panel 600x21x2900mm",
    widthMm: 600,
    heightMm: 2900,
    thicknessMm: 21,
    unitCostCents: 5909,
  },
  blackScrewsPack: {
    name: "Black Stainless Steel Screws - Pack of 100",
    unitCostCents: 909,
    packQuantity: 100,
  },
  mdfBacking: {
    name: "6mm MDF Sheet 1220x2440mm",
    widthMm: 1220,
    heightMm: 2440,
    thicknessMm: 6,
    unitCostCents: 3400,
  },
  tvBracket: {
    name: "TV Bracket",
    unitCostCents: 5000,
  },
} as const;

function positiveNumber(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 0 ? value : 0;
}

export function calculateSheetQuantity(
  widthMm: number,
  heightMm: number,
  sheetWidthMm: number,
  sheetHeightMm: number
): number {
  const width = positiveNumber(widthMm);
  const height = positiveNumber(heightMm);
  const sheetWidth = positiveNumber(sheetWidthMm);
  const sheetHeight = positiveNumber(sheetHeightMm);

  if (!width || !height || !sheetWidth || !sheetHeight) return 0;

  return Math.ceil(width / sheetWidth) * Math.ceil(height / sheetHeight);
}

export function calculateTvDimensions(tvSizeInches: number): TvDimensions | undefined {
  const diagonalInches = positiveNumber(tvSizeInches);
  if (!diagonalInches) return undefined;

  const diagonalMm = diagonalInches * 25.4;
  const ratioWidth = 16;
  const ratioHeight = 9;
  const ratioDiagonal = Math.sqrt(ratioWidth ** 2 + ratioHeight ** 2);

  return {
    diagonalInches,
    widthMm: Math.round(diagonalMm * (ratioWidth / ratioDiagonal)),
    heightMm: Math.round(diagonalMm * (ratioHeight / ratioDiagonal)),
  };
}

export function calculateTvBackdropDimensions(tvSizeInches: number): TvBackdropDimensions | undefined {
  const tv = calculateTvDimensions(tvSizeInches);
  if (!tv) return undefined;

  return {
    ...tv,
    backdropWidthMm: tv.widthMm + TV_BACKDROP_EXTENSION_MM * 2,
    backdropHeightMm: tv.heightMm + TV_BACKDROP_EXTENSION_MM * 2,
  };
}

function addOrMergeLine(lines: MaterialLine[], line: MaterialLine) {
  const existing = lines.find(current => current.key === line.key && current.unitCostCents === line.unitCostCents);
  if (existing) {
    existing.quantity += line.quantity;
    if (line.notes?.length) existing.notes = [...(existing.notes || []), ...line.notes];
    return;
  }
  lines.push({ ...line, notes: line.notes ? [...line.notes] : undefined });
}

function calculateReferenceCost(lines: MaterialLine[]) {
  return lines.reduce((total, line) => total + line.quantity * (line.unitCostCents || 0), 0);
}

function getTvBackdropProduct(products: ProductSelectionForMaterials[]) {
  return products.find(product => product.productType === "tv_backdrop" || /tv\s*backdrop/i.test(product.productName));
}

function hasSupplyTvBracket(products: ProductSelectionForMaterials[]) {
  return products.some(product => /supply.*tv.*bracket|tv.*bracket/i.test(product.productName));
}

export function estimateWallMaterials(wall: WallForMaterials): MaterialEstimate {
  const lines: MaterialLine[] = [];
  const notes: string[] = [];
  const tvBackdropProduct = getTvBackdropProduct(wall.products);
  const tvBackdropDimensions = tvBackdropProduct?.tvSizeInches
    ? calculateTvBackdropDimensions(tvBackdropProduct.tvSizeInches)
    : undefined;

  for (const product of wall.products) {
    if (product.productType === "marble_sheet") {
      const calculationWidthMm = tvBackdropDimensions?.backdropWidthMm ?? wall.wallWidthMm;
      const calculationHeightMm = tvBackdropDimensions?.backdropHeightMm ?? wall.wallHeightMm;
      const sheetQty = calculateSheetQuantity(
        calculationWidthMm,
        calculationHeightMm,
        MATERIAL_BASELINES.pvcMarbleSheet.widthMm,
        MATERIAL_BASELINES.pvcMarbleSheet.heightMm
      );

      addOrMergeLine(lines, {
        key: "pvc-marble-sheet",
        name: MATERIAL_BASELINES.pvcMarbleSheet.name,
        quantity: sheetQty,
        unitCostCents: product.unitCostCents ?? MATERIAL_BASELINES.pvcMarbleSheet.unitCostCents,
        source: "automatic",
        notes: [
          tvBackdropDimensions
            ? `Calculated from TV backdrop size ${tvBackdropDimensions.backdropWidthMm}x${tvBackdropDimensions.backdropHeightMm}mm.`
            : "Calculated from wall width/height and stored PVC sheet dimensions.",
        ],
      });

      addOrMergeLine(lines, {
        key: "high-tack-glue",
        name: MATERIAL_BASELINES.highTackGlue.name,
        quantity: sheetQty,
        unitCostCents: MATERIAL_BASELINES.highTackGlue.unitCostCents,
        source: "automatic",
        notes: ["Locked rule: 1 glue per PVC marble sheet."],
      });
    }

    if (product.productType === "acoustic_panel") {
      const panelQty = product.quantity || calculateSheetQuantity(
        wall.wallWidthMm,
        wall.wallHeightMm,
        MATERIAL_BASELINES.acousticSlatPanel.widthMm,
        MATERIAL_BASELINES.acousticSlatPanel.heightMm
      );

      addOrMergeLine(lines, {
        key: "acoustic-slat-panel",
        name: product.productName || MATERIAL_BASELINES.acousticSlatPanel.name,
        quantity: panelQty,
        unitCostCents: product.unitCostCents ?? MATERIAL_BASELINES.acousticSlatPanel.unitCostCents,
        source: "automatic",
        notes: ["Panel quantity is calculated from wall width/height and stored panel dimensions."],
      });

      if (product.acousticFixingMethod === "glue" || product.acousticFixingMethod === "screws_and_glue") {
        addOrMergeLine(lines, {
          key: "acoustic-glue",
          name: MATERIAL_BASELINES.highTackGlue.name,
          quantity: Math.ceil(panelQty / ACOUSTIC_GLUE_PANEL_RATIO),
          unitCostCents: MATERIAL_BASELINES.highTackGlue.unitCostCents,
          source: "operator_selected",
          notes: ["Locked rule: 1 glue per 2 acoustic panels, rounded up."],
        });
      }

      if (product.acousticFixingMethod === "screws" || product.acousticFixingMethod === "screws_and_glue") {
        addOrMergeLine(lines, {
          key: "black-screws",
          name: "Black Stainless Steel Screws",
          quantity: panelQty * ACOUSTIC_SCREWS_PER_PANEL,
          source: "operator_selected",
          notes: ["Locked rule: 9 screws per acoustic panel."],
        });
      }
    }

    if (product.productType === "floating_cabinet" || product.productType === "side_tower") {
      notes.push(`${product.productName} is custom joinery. Dimensions are captured for quote/execution, but automatic material costing is deliberately excluded.`);
    }
  }

  if (tvBackdropProduct) {
    if (!tvBackdropDimensions) {
      notes.push("TV Backdrop selected but TV size is missing. MDF/PVC backdrop material quantities should be reviewed once TV size is entered.");
    } else {
      const mdfQty = calculateSheetQuantity(
        tvBackdropDimensions.backdropWidthMm,
        tvBackdropDimensions.backdropHeightMm,
        MATERIAL_BASELINES.mdfBacking.widthMm,
        MATERIAL_BASELINES.mdfBacking.heightMm
      );

      addOrMergeLine(lines, {
        key: "mdf-backing-6mm",
        name: MATERIAL_BASELINES.mdfBacking.name,
        quantity: mdfQty,
        unitCostCents: MATERIAL_BASELINES.mdfBacking.unitCostCents,
        source: "automatic",
        notes: [
          "Locked rule: MDF backing is automatic only for TV Backdrop.",
          `Calculated from TV backdrop size ${tvBackdropDimensions.backdropWidthMm}x${tvBackdropDimensions.backdropHeightMm}mm.`,
        ],
      });
    }
  }

  if (hasSupplyTvBracket(wall.products)) {
    addOrMergeLine(lines, {
      key: "tv-bracket",
      name: MATERIAL_BASELINES.tvBracket.name,
      quantity: 1,
      unitCostCents: MATERIAL_BASELINES.tvBracket.unitCostCents,
      source: "automatic",
      notes: ["Included because Supply & Install TV Bracket was selected."],
    });
  }

  return {
    wallName: wall.wallName,
    lines,
    referenceCostCents: calculateReferenceCost(lines),
    notes,
  };
}

export function estimateQuoteMaterials(walls: WallForMaterials[]): MaterialEstimate[] {
  return walls.map(estimateWallMaterials);
}
