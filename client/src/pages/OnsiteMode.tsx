import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FolderOpen, Loader2, Save, WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildOnsiteRoute,
  buildQuoteFromOnsiteRoute,
  createEmptyOnsiteDraftSnapshot,
  createOnsiteDraftExportBundle,
  createOnsiteDraftId,
  getOnsiteDraftIdFromLocation,
  hasMeaningfulOnsiteDraft,
  type OnsiteDraftRecord,
  type OnsiteDraftSnapshot,
} from "@/lib/onsite/onsiteDrafts";
import { getOnsiteDraft, saveOnsiteDraft } from "@/lib/onsite/onsiteDraftStore";

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function hasCachedUser() {
  try {
    return Boolean(localStorage.getItem("manus-runtime-user-info"));
  } catch {
    return false;
  }
}

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

export default function OnsiteMode() {
  const [location, navigate] = useLocation();
  const [snapshot, setSnapshot] = useState<OnsiteDraftSnapshot>(createEmptyOnsiteDraftSnapshot);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [quoteResumeJobId, setQuoteResumeJobId] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<OnsiteDraftRecord["syncStatus"]>("local_only");
  const [hydrating, setHydrating] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const snapshotHash = useMemo(() => JSON.stringify(snapshot), [snapshot]);
  const draftIdFromRoute = getOnsiteDraftIdFromLocation(location);

  const updateField = <K extends keyof OnsiteDraftSnapshot>(key: K, value: OnsiteDraftSnapshot[K]) => {
    setSnapshot(current => ({ ...current, [key]: value }));
  };

  const persistDraft = async (draftId: string, nextSnapshot: OnsiteDraftSnapshot) => {
    const timestamp = new Date().toISOString();
    const record: OnsiteDraftRecord = {
      localOnsiteDraftId: draftId,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus,
      source: "onsite",
      schemaVersion: 1,
      quoteResumeJobId,
      snapshot: nextSnapshot,
    };
    const existing = currentDraftId ? await getOnsiteDraft(currentDraftId) : null;
    if (existing) {
      record.createdAt = existing.createdAt;
      record.syncStatus = existing.syncStatus;
      record.quoteResumeJobId = existing.quoteResumeJobId ?? quoteResumeJobId;
    }
    await saveOnsiteDraft(record);
    return record;
  };

  const ensureDraftSavedNow = async () => {
    const draftId = currentDraftId || createOnsiteDraftId();
    if (!hasMeaningfulOnsiteDraft(snapshot)) {
      return draftId;
    }

    setSaveState("saving");
    try {
      const saved = await persistDraft(draftId, snapshot);
      setCurrentDraftId(saved.localOnsiteDraftId);
      setQuoteResumeJobId(saved.quoteResumeJobId ?? null);
      setSyncStatus(saved.syncStatus);
      setSaveState("saved");
      if (draftIdFromRoute !== saved.localOnsiteDraftId) {
        navigate(buildOnsiteRoute(saved.localOnsiteDraftId));
      }
      return saved.localOnsiteDraftId;
    } catch (error: any) {
      setSaveState("error");
      toast.error(error?.message || "Local save failed");
      throw error;
    }
  };

  const handoffToQuoteForm = async (mode: "resume" | "create") => {
    if (!hasMeaningfulOnsiteDraft(snapshot)) {
      toast.error("Enter onsite details first");
      return;
    }
    if (!navigator.onLine) {
      toast.error("Quote handoff needs internet");
      return;
    }

    try {
      const savedDraftId = await ensureDraftSavedNow();
      const nextResumeJobId = mode === "resume" ? quoteResumeJobId : null;
      const returnPath = buildQuoteFromOnsiteRoute(savedDraftId, nextResumeJobId);
      if (hasCachedUser()) {
        navigate(returnPath);
      } else {
        window.location.href = getLoginUrl(returnPath);
      }
    } catch {
      // save error already surfaced
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!draftIdFromRoute) {
      setCurrentDraftId(null);
      setQuoteResumeJobId(null);
      setSyncStatus("local_only");
      setSnapshot(createEmptyOnsiteDraftSnapshot());
      setHydrating(false);
      setSaveState("idle");
      return;
    }

    setHydrating(true);
    void (async () => {
      try {
        const record = await getOnsiteDraft(draftIdFromRoute);
        if (cancelled) return;
        if (!record) {
          toast.error("Onsite draft not found");
          navigate("/onsite/drafts");
          return;
        }
        setCurrentDraftId(record.localOnsiteDraftId);
        setQuoteResumeJobId(record.quoteResumeJobId ?? null);
        setSyncStatus(record.syncStatus);
        setSnapshot(record.snapshot);
        setSaveState("saved");
      } catch (error: any) {
        if (!cancelled) {
          setSaveState("error");
          toast.error(error?.message || "Failed to open onsite draft");
        }
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftIdFromRoute, navigate]);

  useEffect(() => {
    if (hydrating) return;
    if (!hasMeaningfulOnsiteDraft(snapshot)) {
      setSaveState("idle");
      return;
    }

    setSaveState("unsaved");
    const timeoutId = window.setTimeout(async () => {
      const draftId = currentDraftId || createOnsiteDraftId();
      try {
        setSaveState("saving");
        const saved = await persistDraft(draftId, snapshot);
        setCurrentDraftId(saved.localOnsiteDraftId);
        setQuoteResumeJobId(saved.quoteResumeJobId ?? null);
        setSyncStatus(saved.syncStatus);
        setSaveState("saved");
        if (draftIdFromRoute !== saved.localOnsiteDraftId) {
          navigate(buildOnsiteRoute(saved.localOnsiteDraftId));
        }
      } catch {
        setSaveState("error");
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [currentDraftId, draftIdFromRoute, hydrating, navigate, quoteResumeJobId, snapshot, snapshotHash, syncStatus]);

  const saveStatusLabel =
    saveState === "unsaved"
      ? "Unsaved changes"
      : saveState === "saving"
        ? "Saving locally"
        : saveState === "error"
          ? "Local save failed"
          : saveState === "saved" && !isOnline
            ? "Saved locally — offline"
            : saveState === "saved"
              ? "Saved locally"
              : "Saved locally";

  const saveStatusClass =
    saveState === "error"
      ? "bg-red-100 text-red-800"
      : saveState === "saving"
        ? "bg-blue-100 text-blue-800"
        : saveState === "unsaved"
          ? "bg-amber-100 text-amber-800"
          : "bg-emerald-100 text-emerald-800";

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 pb-8 pt-4">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-slate-900">Onsite Mode</h1>
            <p className="text-xs text-slate-600">Offline-first measurement capture</p>
          </div>
          <Button variant="outline" className="h-10" onClick={() => navigate("/onsite/drafts")}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Drafts
          </Button>
        </div>

        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${saveStatusClass}`}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saveStatusLabel}
            </span>
            {!isOnline && (
              <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                <WifiOff className="mr-1.5 h-3.5 w-3.5" />
                Offline
              </span>
            )}
            {syncStatus === "quote_started" && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                Quote linked
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button className="h-11" onClick={() => handoffToQuoteForm("create")}>
              Create Quote from Onsite Draft
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => handoffToQuoteForm("resume")}
              disabled={!quoteResumeJobId}
            >
              Resume in Quote Form
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 flex-1"
              onClick={() => {
                if (!currentDraftId) {
                  toast.error("Save a draft first");
                  return;
                }
                downloadJsonFile(
                  `teamquo-onsite-${currentDraftId}.json`,
                  createOnsiteDraftExportBundle([
                    {
                      localOnsiteDraftId: currentDraftId,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      syncStatus,
                      source: "onsite",
                      schemaVersion: 1,
                      quoteResumeJobId,
                      snapshot,
                    },
                  ])
                );
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-slate-900">Customer & Site</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" className="mt-1 h-11" value={snapshot.customerName} onChange={event => updateField("customerName", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="customerPhone">Customer phone</Label>
              <Input id="customerPhone" inputMode="tel" className="mt-1 h-11" value={snapshot.customerPhone} onChange={event => updateField("customerPhone", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="customerEmail">Customer email</Label>
              <Input id="customerEmail" type="email" className="mt-1 h-11" value={snapshot.customerEmail} onChange={event => updateField("customerEmail", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="siteAddress">Site address</Label>
              <Input id="siteAddress" className="mt-1 h-11" value={snapshot.siteAddress} onChange={event => updateField("siteAddress", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="suburb">Suburb</Label>
              <Input id="suburb" className="mt-1 h-11" value={snapshot.suburb} onChange={event => updateField("suburb", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="roomName">Room name</Label>
              <Input id="roomName" className="mt-1 h-11" value={snapshot.roomName} onChange={event => updateField("roomName", event.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-slate-900">Wall</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="wallWidthMm">Wall width mm</Label>
              <Input id="wallWidthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.wallWidthMm} onChange={event => updateField("wallWidthMm", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="wallHeightMm">Wall height mm</Label>
              <Input id="wallHeightMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.wallHeightMm} onChange={event => updateField("wallHeightMm", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ceilingHeightMm">Ceiling height mm</Label>
              <Input id="ceilingHeightMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.ceilingHeightMm} onChange={event => updateField("ceilingHeightMm", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="wallNotes">Wall notes</Label>
              <Textarea id="wallNotes" className="mt-1 min-h-24" value={snapshot.wallNotes} onChange={event => updateField("wallNotes", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="studWallNotes">Stud wall notes</Label>
              <Textarea id="studWallNotes" className="mt-1 min-h-24" value={snapshot.studWallNotes} onChange={event => updateField("studWallNotes", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="obstructionNotes">Obstruction notes</Label>
              <Textarea id="obstructionNotes" className="mt-1 min-h-24" value={snapshot.obstructionNotes} onChange={event => updateField("obstructionNotes", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="powerpointNotes">Power point notes</Label>
              <Textarea id="powerpointNotes" className="mt-1 min-h-24" value={snapshot.powerpointNotes} onChange={event => updateField("powerpointNotes", event.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-slate-900">TV & Backdrop</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tvSizeInches">TV size inches</Label>
              <Input id="tvSizeInches" inputMode="numeric" className="mt-1 h-11" value={snapshot.tvSizeInches} onChange={event => updateField("tvSizeInches", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="tvModel">TV model</Label>
              <Input id="tvModel" className="mt-1 h-11" value={snapshot.tvModel} onChange={event => updateField("tvModel", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="vesaNotes">VESA notes</Label>
              <Textarea id="vesaNotes" className="mt-1 min-h-24" value={snapshot.vesaNotes} onChange={event => updateField("vesaNotes", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="desiredTvCentreHeightMm">Desired TV centre height mm</Label>
              <Input id="desiredTvCentreHeightMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.desiredTvCentreHeightMm} onChange={event => updateField("desiredTvCentreHeightMm", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="backdropWidthMm">Backdrop width mm</Label>
              <Input id="backdropWidthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.backdropWidthMm} onChange={event => updateField("backdropWidthMm", event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="backdropHeightMm">Backdrop height mm</Label>
              <Input id="backdropHeightMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.backdropHeightMm} onChange={event => updateField("backdropHeightMm", event.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-slate-900">Cabinet & Towers</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="floatingCabinetWidthMm">Floating cabinet width mm</Label>
              <Input id="floatingCabinetWidthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.floatingCabinetWidthMm} onChange={event => updateField("floatingCabinetWidthMm", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="floatingCabinetHeightMm">Floating cabinet height mm</Label>
              <Input id="floatingCabinetHeightMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.floatingCabinetHeightMm} onChange={event => updateField("floatingCabinetHeightMm", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="floatingCabinetDepthMm">Floating cabinet depth mm</Label>
              <Input id="floatingCabinetDepthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.floatingCabinetDepthMm} onChange={event => updateField("floatingCabinetDepthMm", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="floatingCabinetBottomFromFloorMm">Floating cabinet bottom from floor mm</Label>
              <Input id="floatingCabinetBottomFromFloorMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.floatingCabinetBottomFromFloorMm} onChange={event => updateField("floatingCabinetBottomFromFloorMm", event.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Left side tower</p>
                <p className="text-xs text-slate-500">Enable onsite capture</p>
              </div>
              <Button variant={snapshot.sideTowerLeftEnabled ? "default" : "outline"} className="h-10" onClick={() => updateField("sideTowerLeftEnabled", !snapshot.sideTowerLeftEnabled)}>
                {snapshot.sideTowerLeftEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            {snapshot.sideTowerLeftEnabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="sideTowerLeftWidthMm">Left width mm</Label>
                  <Input id="sideTowerLeftWidthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.sideTowerLeftWidthMm} onChange={event => updateField("sideTowerLeftWidthMm", event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sideTowerLeftHeightMm">Left height mm</Label>
                  <Input id="sideTowerLeftHeightMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.sideTowerLeftHeightMm} onChange={event => updateField("sideTowerLeftHeightMm", event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sideTowerLeftDepthMm">Left depth mm</Label>
                  <Input id="sideTowerLeftDepthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.sideTowerLeftDepthMm} onChange={event => updateField("sideTowerLeftDepthMm", event.target.value)} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Right side tower</p>
                <p className="text-xs text-slate-500">Enable onsite capture</p>
              </div>
              <Button variant={snapshot.sideTowerRightEnabled ? "default" : "outline"} className="h-10" onClick={() => updateField("sideTowerRightEnabled", !snapshot.sideTowerRightEnabled)}>
                {snapshot.sideTowerRightEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            {snapshot.sideTowerRightEnabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="sideTowerRightWidthMm">Right width mm</Label>
                  <Input id="sideTowerRightWidthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.sideTowerRightWidthMm} onChange={event => updateField("sideTowerRightWidthMm", event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sideTowerRightHeightMm">Right height mm</Label>
                  <Input id="sideTowerRightHeightMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.sideTowerRightHeightMm} onChange={event => updateField("sideTowerRightHeightMm", event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sideTowerRightDepthMm">Right depth mm</Label>
                  <Input id="sideTowerRightDepthMm" inputMode="numeric" className="mt-1 h-11" value={snapshot.sideTowerRightDepthMm} onChange={event => updateField("sideTowerRightDepthMm", event.target.value)} />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-slate-900">Finish & Installer Notes</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="claddingType">Cladding type</Label>
              <Input id="claddingType" className="mt-1 h-11" value={snapshot.claddingType} onChange={event => updateField("claddingType", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="materialNotes">Material notes</Label>
              <Textarea id="materialNotes" className="mt-1 min-h-24" value={snapshot.materialNotes} onChange={event => updateField("materialNotes", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="installerNotes">Installer notes</Label>
              <Textarea id="installerNotes" className="mt-1 min-h-24" value={snapshot.installerNotes} onChange={event => updateField("installerNotes", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="photoReferenceNotes">Photo reference notes</Label>
              <Textarea id="photoReferenceNotes" className="mt-1 min-h-24" value={snapshot.photoReferenceNotes} onChange={event => updateField("photoReferenceNotes", event.target.value)} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
