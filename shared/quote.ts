export function formatQuoteNumber(
  job: { id: number; createdAt?: Date | string | null } | null | undefined
): string {
  if (!job) return "Q-0000-0000";

  const createdAt = job.createdAt ? new Date(job.createdAt) : new Date();
  const year = Number.isNaN(createdAt.getFullYear())
    ? new Date().getFullYear()
    : createdAt.getFullYear();
  const paddedId = String(job.id).padStart(4, "0");

  return `Q-${year}-${paddedId}`;
}

export function formatMoneyFromCents(cents: number | null | undefined): string {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export type CustomerAddOnKey =
  | "tv_bracket"
  | "led_strip"
  | "extra_cutouts"
  | "customer_extras"
  | "custom";

export type CustomerAddOn = {
  key: CustomerAddOnKey;
  label: string;
  quantity: number;
  unitPrice: number;
  customLabel?: string | null;
};

export type QuoteMeta = {
  customerAddOns?: CustomerAddOn[];
};

export type WallMeta = {
  obstructionStatus: "unknown" | "none" | "present";
  obstructionNotes: string;
  supplyInstallPrice?: number | null;
};

export const DEFAULT_CUSTOMER_ADD_ONS: CustomerAddOn[] = [
  { key: "tv_bracket", label: "TV bracket", quantity: 0, unitPrice: 0 },
  { key: "led_strip", label: "LED strip", quantity: 0, unitPrice: 0 },
  { key: "extra_cutouts", label: "Extra cutouts", quantity: 0, unitPrice: 0 },
  { key: "customer_extras", label: "Customer extras", quantity: 0, unitPrice: 0 },
  { key: "custom", label: "Custom add-on", quantity: 0, unitPrice: 0, customLabel: "" },
];

export function getCustomerAddOnDisplayLabel(addOn: CustomerAddOn) {
  if (addOn.key === "custom" && addOn.customLabel?.trim()) {
    return addOn.customLabel.trim();
  }
  return addOn.label;
}

export function calculateCustomerAddOnTotal(addOn: CustomerAddOn) {
  return Math.max(0, addOn.quantity || 0) * Math.max(0, addOn.unitPrice || 0);
}

export function normaliseCustomerAddOns(addOns: CustomerAddOn[] | null | undefined) {
  const merged = new Map(DEFAULT_CUSTOMER_ADD_ONS.map(addOn => [addOn.key, { ...addOn }]));
  for (const addOn of addOns || []) {
    if (!addOn?.key || !merged.has(addOn.key)) continue;
    merged.set(addOn.key, {
      ...merged.get(addOn.key)!,
      ...addOn,
      quantity: Number.isFinite(addOn.quantity) ? Math.max(0, Math.round(addOn.quantity)) : 0,
      unitPrice: Number.isFinite(addOn.unitPrice) ? Math.max(0, Math.round(addOn.unitPrice)) : 0,
      customLabel: addOn.customLabel ?? "",
    });
  }
  return Array.from(merged.values());
}

export function decodeQuoteMeta(notes: unknown): QuoteMeta {
  if (typeof notes !== "string" || !notes.trim()) return {};
  try {
    const parsed = JSON.parse(notes);
    if (!parsed || typeof parsed !== "object") return {};
    return {
      customerAddOns: Array.isArray((parsed as any).customerAddOns)
        ? normaliseCustomerAddOns((parsed as any).customerAddOns)
        : undefined,
    };
  } catch {
    return {};
  }
}

export function encodeQuoteMeta(meta: QuoteMeta) {
  const payload: QuoteMeta = {};
  const addOns = normaliseCustomerAddOns(meta.customerAddOns).filter(
    addOn => addOn.quantity > 0 || addOn.unitPrice > 0 || (addOn.key === "custom" && addOn.customLabel?.trim())
  );
  if (addOns.length > 0) payload.customerAddOns = addOns;
  return Object.keys(payload).length ? JSON.stringify(payload) : null;
}

export function decodeWallMeta(notes: unknown): WallMeta {
  if (typeof notes !== "string" || !notes.trim()) {
    return { obstructionStatus: "none", obstructionNotes: "", supplyInstallPrice: null };
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && ["unknown", "none", "present"].includes((parsed as any).obstructionStatus)) {
      return {
        obstructionStatus: (parsed as any).obstructionStatus,
        obstructionNotes: String((parsed as any).obstructionNotes || ""),
        supplyInstallPrice:
          Number.isFinite(Number((parsed as any).supplyInstallPrice)) ? Math.max(0, Math.round(Number((parsed as any).supplyInstallPrice))) : null,
      };
    }
  } catch {
    return { obstructionStatus: "unknown", obstructionNotes: notes, supplyInstallPrice: null };
  }

  return { obstructionStatus: "unknown", obstructionNotes: notes, supplyInstallPrice: null };
}

export function encodeWallMeta(meta: WallMeta) {
  return JSON.stringify({
    obstructionStatus: meta.obstructionStatus,
    obstructionNotes: meta.obstructionNotes,
    supplyInstallPrice:
      Number.isFinite(Number(meta.supplyInstallPrice)) && Number(meta.supplyInstallPrice) >= 0
        ? Math.round(Number(meta.supplyInstallPrice))
        : undefined,
  });
}

export const CUSTOMER_FACING_COMPANY_NAME =
  "Skywall Cabinets";

export const COMPANY_CONTACT_DETAILS = {
  abn: "52 935 732 589",
  address: "38 Tuxworth Drive, Kalkallo 3064 VIC",
  phone: "0431 889 004",
  email: "info@skywallcabinets.com.au",
  website: "www.skywallcabinets.com.au",
};

export const QUOTE_TERMS = [
  "Wall dimensions and included products are shown to define the quoted scope only.",
  "Quote valid for 30 days from the quote date.",
];
