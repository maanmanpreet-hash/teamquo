export type OrientationRule = "vertical" | "horizontal" | "either";

export interface MaterialMetadata {
  supplier?: string;
  notes?: string;
  wastagePercent?: number;
  orientationRule?: OrientationRule;
}

export interface PanelCalculationInput {
  wallWidthMm: number;
  wallHeightMm: number;
  panelWidthMm: number;
  panelHeightMm: number;
  productName?: string;
  productDescription?: string | null;
  wastagePercent?: number;
  orientationRule?: OrientationRule;
}

export interface PanelCalculationResult {
  status: "calculated" | "manual_review_required";
  manualReviewRequired: boolean;
  selectedOrientation: "vertical" | "horizontal";
  orientationLabel: string;
  panelsAcross: number;
  panelsHigh: number;
  baseQuantity: number;
  wastageQuantity: number;
  finalQuantity: number;
  wastagePercent: number;
  coverageWidthMm: number;
  coverageHeightMm: number;
  offcutWidthMm: number;
  offcutHeightMm: number;
  reviewReasons: string[];
  internalNotes: string[];
  customerNotes: string[];
  materialMetadata: MaterialMetadata;
}

interface OrientationCandidate {
  selectedOrientation: "vertical" | "horizontal";
  orientationLabel: string;
  panelWidthMm: number;
  panelHeightMm: number;
  panelsAcross: number;
  panelsHigh: number;
  baseQuantity: number;
  coverageWidthMm: number;
  coverageHeightMm: number;
  offcutWidthMm: number;
  offcutHeightMm: number;
  needsHeightJoin: boolean;
}

const DEFAULT_WASTAGE_PERCENT = 10;

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeOrientation(value: string | undefined): OrientationRule | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (["vertical", "portrait", "upright", "as supplied", "as-supplied"].includes(normalized)) return "vertical";
  if (["horizontal", "landscape", "rotated"].includes(normalized)) return "horizontal";
  if (["either", "both", "any"].includes(normalized)) return "either";
  return undefined;
}

export function parseMaterialMetadata(description?: string | null): MaterialMetadata {
  const metadata: MaterialMetadata = {};
  if (!description) return metadata;

  const lines = description
    .split(/\r?\n|;/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [rawKey, ...rawValueParts] = line.split(":");
    if (rawValueParts.length === 0) continue;

    const key = rawKey.toLowerCase().trim();
    const value = rawValueParts.join(":").trim();

    if (["supplier", "vendor"].includes(key)) {
      metadata.supplier = value;
      continue;
    }

    if (["note", "notes", "material notes"].includes(key)) {
      metadata.notes = value;
      continue;
    }

    if (["wastage", "default wastage", "waste", "wastage percent", "wastage %"].includes(key)) {
      const parsed = normalizeNumber(value);
      if (parsed !== undefined) metadata.wastagePercent = parsed;
      continue;
    }

    if (["orientation", "install orientation", "orientation rule"].includes(key)) {
      metadata.orientationRule = normalizeOrientation(value);
    }
  }

  const inlineWastage = description.match(/(?:default\s+)?wastage\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%?/i);
  if (inlineWastage && metadata.wastagePercent === undefined) {
    metadata.wastagePercent = Number(inlineWastage[1]);
  }

  const inlineOrientation = description.match(/(?:install\s+)?orientation(?:\s+rule)?\s*[:=]\s*([a-z -]+)/i);
  if (inlineOrientation && !metadata.orientationRule) {
    metadata.orientationRule = normalizeOrientation(inlineOrientation[1]);
  }

  return metadata;
}

function buildCandidate(
  selectedOrientation: "vertical" | "horizontal",
  wallWidthMm: number,
  wallHeightMm: number,
  panelWidthMm: number,
  panelHeightMm: number
): OrientationCandidate {
  const effectiveWidth = selectedOrientation === "vertical" ? panelWidthMm : panelHeightMm;
  const effectiveHeight = selectedOrientation === "vertical" ? panelHeightMm : panelWidthMm;
  const panelsAcross = Math.ceil(wallWidthMm / effectiveWidth);
  const panelsHigh = Math.ceil(wallHeightMm / effectiveHeight);
  const coverageWidthMm = panelsAcross * effectiveWidth;
  const coverageHeightMm = panelsHigh * effectiveHeight;

  return {
    selectedOrientation,
    orientationLabel: selectedOrientation === "vertical" ? "As supplied / vertical" : "Rotated / horizontal",
    panelWidthMm: effectiveWidth,
    panelHeightMm: effectiveHeight,
    panelsAcross,
    panelsHigh,
    baseQuantity: panelsAcross * panelsHigh,
    coverageWidthMm,
    coverageHeightMm,
    offcutWidthMm: coverageWidthMm - wallWidthMm,
    offcutHeightMm: coverageHeightMm - wallHeightMm,
    needsHeightJoin: wallHeightMm > effectiveHeight,
  };
}

function buildManualResult(input: PanelCalculationInput, reason: string): PanelCalculationResult {
  const metadata = parseMaterialMetadata(input.productDescription);
  return {
    status: "manual_review_required",
    manualReviewRequired: true,
    selectedOrientation: "vertical",
    orientationLabel: "Manual review required",
    panelsAcross: 0,
    panelsHigh: 0,
    baseQuantity: 0,
    wastageQuantity: 0,
    finalQuantity: 0,
    wastagePercent: input.wastagePercent ?? metadata.wastagePercent ?? DEFAULT_WASTAGE_PERCENT,
    coverageWidthMm: 0,
    coverageHeightMm: 0,
    offcutWidthMm: 0,
    offcutHeightMm: 0,
    reviewReasons: [reason],
    internalNotes: ["Manual review required before quote can be relied on."],
    customerNotes: ["Final quantity is subject to site measurement review."],
    materialMetadata: metadata,
  };
}

export function calculatePanelRequirement(input: PanelCalculationInput): PanelCalculationResult {
  const metadata = parseMaterialMetadata(input.productDescription);
  const wallWidthMm = Math.round(input.wallWidthMm);
  const wallHeightMm = Math.round(input.wallHeightMm);
  const panelWidthMm = Math.round(input.panelWidthMm);
  const panelHeightMm = Math.round(input.panelHeightMm);

  if (wallWidthMm <= 0 || wallHeightMm <= 0) {
    return buildManualResult(input, "Wall dimensions are missing or invalid.");
  }

  if (panelWidthMm <= 0 || panelHeightMm <= 0) {
    return buildManualResult(input, "Selected product panel/sheet dimensions are missing or invalid.");
  }

  const orientationRule = input.orientationRule ?? metadata.orientationRule ?? "vertical";
  const wastagePercent = Math.max(
    0,
    Math.min(100, input.wastagePercent ?? metadata.wastagePercent ?? DEFAULT_WASTAGE_PERCENT)
  );

  const candidates = (orientationRule === "either"
    ? [
        buildCandidate("vertical", wallWidthMm, wallHeightMm, panelWidthMm, panelHeightMm),
        buildCandidate("horizontal", wallWidthMm, wallHeightMm, panelWidthMm, panelHeightMm),
      ]
    : [
        buildCandidate(
          orientationRule === "horizontal" ? "horizontal" : "vertical",
          wallWidthMm,
          wallHeightMm,
          panelWidthMm,
          panelHeightMm
        ),
      ]).sort((a, b) => {
    if (a.needsHeightJoin !== b.needsHeightJoin) return a.needsHeightJoin ? 1 : -1;
    if (a.baseQuantity !== b.baseQuantity) return a.baseQuantity - b.baseQuantity;
    return a.selectedOrientation === "vertical" ? -1 : 1;
  });

  const selected = candidates[0];
  const wastageQuantity = Math.ceil(selected.baseQuantity * (wastagePercent / 100));
  const finalQuantity = selected.baseQuantity + wastageQuantity;
  const reviewReasons: string[] = [];
  const internalNotes: string[] = [];
  const customerNotes: string[] = [];

  internalNotes.push(
    `Grid calculation used: ${selected.panelsAcross} across x ${selected.panelsHigh} high = ${selected.baseQuantity} base panel(s).`
  );
  internalNotes.push(`Wastage applied: ${wastagePercent}% = ${wastageQuantity} additional panel(s).`);
  internalNotes.push(`Orientation used: ${selected.orientationLabel}.`);
  internalNotes.push(
    `Coverage after cutting allowance: ${(selected.coverageWidthMm / 1000).toFixed(2)}m wide x ${(selected.coverageHeightMm / 1000).toFixed(2)}m high.`
  );

  if (selected.needsHeightJoin) {
    reviewReasons.push("Wall height exceeds single panel/sheet height, so horizontal joins are required or a different product is needed.");
  }

  if (selected.offcutWidthMm > 0) {
    internalNotes.push(`Expected width offcut before obstruction cuts: ${selected.offcutWidthMm}mm total across the run. Offcut reuse not assumed.`);
  }

  if (selected.offcutHeightMm > 0) {
    internalNotes.push(`Expected height offcut before obstruction cuts: ${selected.offcutHeightMm}mm total over the height. Offcut reuse not assumed.`);
  }

  if (selected.panelsAcross > 1) {
    internalNotes.push("Vertical joins/seams likely. Confirm join position against visual layout before final quote.");
  }

  if (orientationRule === "either" && candidates.length > 1) {
    internalNotes.push("Orientation rule allows either direction. Selected the option with lower join/quantity risk.");
  }

  reviewReasons.push("Openings/obstructions such as TV recesses, power points, windows, corners, or fireplaces are not included in this automatic calculation.");

  customerNotes.push("Quote is based on supplied wall dimensions and selected product size.");
  customerNotes.push("Final material quantity may change after site measurement and obstruction review.");

  return {
    status: reviewReasons.length ? "manual_review_required" : "calculated",
    manualReviewRequired: reviewReasons.length > 0,
    selectedOrientation: selected.selectedOrientation,
    orientationLabel: selected.orientationLabel,
    panelsAcross: selected.panelsAcross,
    panelsHigh: selected.panelsHigh,
    baseQuantity: selected.baseQuantity,
    wastageQuantity,
    finalQuantity,
    wastagePercent,
    coverageWidthMm: selected.coverageWidthMm,
    coverageHeightMm: selected.coverageHeightMm,
    offcutWidthMm: selected.offcutWidthMm,
    offcutHeightMm: selected.offcutHeightMm,
    reviewReasons,
    internalNotes,
    customerNotes,
    materialMetadata: metadata,
  };
}
