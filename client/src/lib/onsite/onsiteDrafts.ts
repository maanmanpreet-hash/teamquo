export const ONSITE_DRAFT_SCHEMA_VERSION = 1;
export const ONSITE_DRAFT_EXPORT_KIND = "teamquo-onsite-drafts";

export type OnsiteDraftSyncStatus = "local_only" | "quote_started";

export interface OnsiteDraftSnapshot {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  siteAddress: string;
  suburb: string;
  roomName: string;
  wallWidthMm: string;
  wallHeightMm: string;
  ceilingHeightMm: string;
  wallNotes: string;
  studWallNotes: string;
  obstructionNotes: string;
  powerpointNotes: string;
  tvSizeInches: string;
  tvModel: string;
  vesaNotes: string;
  desiredTvCentreHeightMm: string;
  backdropWidthMm: string;
  backdropHeightMm: string;
  floatingCabinetWidthMm: string;
  floatingCabinetHeightMm: string;
  floatingCabinetDepthMm: string;
  floatingCabinetBottomFromFloorMm: string;
  sideTowerLeftEnabled: boolean;
  sideTowerRightEnabled: boolean;
  sideTowerLeftWidthMm: string;
  sideTowerLeftHeightMm: string;
  sideTowerLeftDepthMm: string;
  sideTowerRightWidthMm: string;
  sideTowerRightHeightMm: string;
  sideTowerRightDepthMm: string;
  claddingType: string;
  materialNotes: string;
  installerNotes: string;
  photoReferenceNotes: string;
}

export interface OnsiteDraftRecord {
  localOnsiteDraftId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: OnsiteDraftSyncStatus;
  source: "onsite";
  schemaVersion: number;
  quoteResumeJobId?: number | null;
  snapshot: OnsiteDraftSnapshot;
}

export interface OnsiteDraftExportBundle {
  kind: typeof ONSITE_DRAFT_EXPORT_KIND;
  exportedAt: string;
  drafts: OnsiteDraftRecord[];
}

export function createEmptyOnsiteDraftSnapshot(): OnsiteDraftSnapshot {
  return {
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    siteAddress: "",
    suburb: "",
    roomName: "",
    wallWidthMm: "",
    wallHeightMm: "",
    ceilingHeightMm: "",
    wallNotes: "",
    studWallNotes: "",
    obstructionNotes: "",
    powerpointNotes: "",
    tvSizeInches: "",
    tvModel: "",
    vesaNotes: "",
    desiredTvCentreHeightMm: "",
    backdropWidthMm: "",
    backdropHeightMm: "",
    floatingCabinetWidthMm: "",
    floatingCabinetHeightMm: "",
    floatingCabinetDepthMm: "",
    floatingCabinetBottomFromFloorMm: "",
    sideTowerLeftEnabled: false,
    sideTowerRightEnabled: false,
    sideTowerLeftWidthMm: "",
    sideTowerLeftHeightMm: "",
    sideTowerLeftDepthMm: "",
    sideTowerRightWidthMm: "",
    sideTowerRightHeightMm: "",
    sideTowerRightDepthMm: "",
    claddingType: "",
    materialNotes: "",
    installerNotes: "",
    photoReferenceNotes: "",
  };
}

export function createOnsiteDraftId() {
  return globalThis.crypto?.randomUUID?.() ?? `onsite-${Date.now()}`;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

export function hasMeaningfulOnsiteDraft(snapshot: OnsiteDraftSnapshot) {
  return Object.entries(snapshot).some(([key, value]) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return hasText(value);
    return key.length > 0;
  });
}

export function buildOnsiteDraftLabel(record: OnsiteDraftRecord) {
  return (
    record.snapshot.customerName.trim() ||
    record.snapshot.siteAddress.trim() ||
    record.snapshot.roomName.trim() ||
    "Untitled onsite draft"
  );
}

export function buildOnsiteDraftSubtitle(record: OnsiteDraftRecord) {
  const room = record.snapshot.roomName.trim();
  if (room) return room;
  if (record.quoteResumeJobId) return `Quote #${record.quoteResumeJobId}`;
  return "Onsite capture";
}

export function createOnsiteDraftExportBundle(drafts: OnsiteDraftRecord[]): OnsiteDraftExportBundle {
  return {
    kind: ONSITE_DRAFT_EXPORT_KIND,
    exportedAt: new Date().toISOString(),
    drafts,
  };
}

export function isOnsiteDraftRecord(value: unknown): value is OnsiteDraftRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as OnsiteDraftRecord;
  return (
    record.source === "onsite" &&
    typeof record.localOnsiteDraftId === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.schemaVersion === "number" &&
    typeof record.snapshot === "object" &&
    record.snapshot !== null
  );
}

export function parseOnsiteDraftImport(jsonText: string) {
  const parsed = JSON.parse(jsonText) as OnsiteDraftRecord | OnsiteDraftExportBundle;
  if (isOnsiteDraftRecord(parsed)) {
    return [parsed];
  }
  if (parsed && Array.isArray((parsed as OnsiteDraftExportBundle).drafts)) {
    return (parsed as OnsiteDraftExportBundle).drafts.filter(isOnsiteDraftRecord);
  }
  throw new Error("Invalid onsite draft JSON");
}

export function cloneImportedOnsiteDraft(record: OnsiteDraftRecord): OnsiteDraftRecord {
  const timestamp = new Date().toISOString();
  return {
    ...record,
    localOnsiteDraftId: createOnsiteDraftId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildOnsiteRoute(localOnsiteDraftId?: string | null) {
  return localOnsiteDraftId ? `/onsite?draftId=${encodeURIComponent(localOnsiteDraftId)}` : "/onsite";
}

export function getOnsiteDraftIdFromLocation(location: string) {
  const [, queryString = ""] = location.split("?");
  const fallbackQuery = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
  return new URLSearchParams(queryString || fallbackQuery).get("draftId");
}

export function buildQuoteFromOnsiteRoute(localOnsiteDraftId: string, quoteResumeJobId?: number | null) {
  const params = new URLSearchParams();
  params.set("onsiteDraftId", localOnsiteDraftId);
  if (quoteResumeJobId) {
    params.set("resumeJobId", String(quoteResumeJobId));
  }
  return `/quote?${params.toString()}`;
}

export function getOnsiteDraftIdFromQuoteLocation(location: string) {
  const [, queryString = ""] = location.split("?");
  const fallbackQuery = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
  return new URLSearchParams(queryString || fallbackQuery).get("onsiteDraftId");
}
