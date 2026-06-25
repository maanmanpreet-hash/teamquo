import type { CustomerAddOn } from "@shared/quote";
import type { WallWithProducts, WorkflowStep } from "@/lib/quote/types";

const QUOTE_DIRTY_KEY = "skywall-cabinets.quote.unsavedChanges";
const QUOTE_DRAFT_STORAGE_PREFIX = "skywall-cabinets.quote.draft:";
const LEGACY_QUOTE_RECOVERY_KEY = "skywall-cabinets.quote.recoverySnapshot";

export interface QuoteDraftSnapshot {
  version: 1;
  resumeJobId: number | null;
  currentStep: WorkflowStep;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  suburb: string;
  appointmentDate: string;
  appointmentTime: string;
  referenceImageUrl: string;
  wallsWithProducts: WallWithProducts[];
  customerAddOns: CustomerAddOn[];
  updatedAt: string;
}

function getStorageKey(resumeJobId: number | null | undefined) {
  return `${QUOTE_DRAFT_STORAGE_PREFIX}${resumeJobId ?? "new"}`;
}

export function hasMeaningfulQuoteDraft(snapshot: QuoteDraftSnapshot) {
  return Boolean(
    snapshot.clientName.trim() ||
      snapshot.clientEmail.trim() ||
      snapshot.clientPhone.trim() ||
      snapshot.clientAddress.trim() ||
      snapshot.suburb.trim() ||
      snapshot.appointmentDate.trim() ||
      snapshot.appointmentTime.trim() ||
      snapshot.referenceImageUrl.trim() ||
      snapshot.customerAddOns.length > 0 ||
      snapshot.wallsWithProducts.length > 0
  );
}

export function saveQuoteDraft(snapshot: QuoteDraftSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(snapshot.resumeJobId), JSON.stringify(snapshot));
}

export function loadQuoteDraft(resumeJobId: number | null | undefined) {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getStorageKey(resumeJobId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as QuoteDraftSnapshot;
    if (parsed?.version !== 1 || !Array.isArray(parsed.wallsWithProducts) || !Array.isArray(parsed.customerAddOns)) {
      localStorage.removeItem(getStorageKey(resumeJobId));
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(getStorageKey(resumeJobId));
    return null;
  }
}

export function clearQuoteDraft(resumeJobId: number | null | undefined) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(resumeJobId));
}

export function markQuoteDraftDirty() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(QUOTE_DIRTY_KEY, "1");
}

export function clearQuoteDraftDirtyState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(QUOTE_DIRTY_KEY);
}

export function hasUnsavedQuoteDraftChanges() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(QUOTE_DIRTY_KEY) === "1";
}

export function clearLegacyQuoteDraftRecovery() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_QUOTE_RECOVERY_KEY);
}
