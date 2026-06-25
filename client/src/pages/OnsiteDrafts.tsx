import { useEffect, useState } from "react";
import { ArrowLeft, Download, Edit, FileUp, Loader2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildOnsiteDraftLabel,
  buildOnsiteDraftSubtitle,
  buildOnsiteRoute,
  buildQuoteFromOnsiteRoute,
  cloneImportedOnsiteDraft,
  createOnsiteDraftExportBundle,
  parseOnsiteDraftImport,
  type OnsiteDraftRecord,
} from "@/lib/onsite/onsiteDrafts";
import { deleteOnsiteDraft, importOnsiteDrafts, listOnsiteDrafts } from "@/lib/onsite/onsiteDraftStore";

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

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function OnsiteDrafts() {
  const [, navigate] = useLocation();
  const [drafts, setDrafts] = useState<OnsiteDraftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      setDrafts(await listOnsiteDrafts());
    } finally {
      setLoading(false);
    }
  };

  const openQuote = (draft: OnsiteDraftRecord, mode: "resume" | "create") => {
    if (!navigator.onLine) {
      toast.error("Quote handoff needs internet");
      return;
    }
    const returnPath = buildQuoteFromOnsiteRoute(
      draft.localOnsiteDraftId,
      mode === "resume" ? draft.quoteResumeJobId : null
    );
    if (hasCachedUser()) {
      navigate(returnPath);
    } else {
      window.location.href = getLoginUrl(returnPath);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-3 pb-8 pt-4">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate("/onsite")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-slate-900">Onsite Drafts</h1>
            <p className="text-xs text-slate-600">Local drafts on this device</p>
          </div>
          <Button variant="outline" className="h-10" onClick={() => navigate("/onsite")}>
            New
          </Button>
        </div>

        <Card className="space-y-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-10 flex-1"
              disabled={drafts.length === 0}
              onClick={() => downloadJsonFile("teamquo-onsite-drafts.json", createOnsiteDraftExportBundle(drafts))}
            >
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button asChild variant="outline" className="h-10 flex-1">
              <label>
                <FileUp className="mr-2 h-4 w-4" />
                Import JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async event => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    try {
                      const imported = parseOnsiteDraftImport(await file.text()).map(cloneImportedOnsiteDraft);
                      await importOnsiteDrafts(imported);
                      await reload();
                      toast.success(imported.length === 1 ? "Onsite draft imported" : `${imported.length} onsite drafts imported`);
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to import onsite drafts");
                    }
                  }}
                />
              </label>
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          </div>
        ) : drafts.length === 0 ? (
          <Card className="p-4 text-sm text-slate-600">No onsite drafts yet.</Card>
        ) : (
          drafts.map(draft => (
            <Card key={draft.localOnsiteDraftId} className="space-y-3 p-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{buildOnsiteDraftLabel(draft)}</h2>
                <p className="text-xs text-slate-600">{buildOnsiteDraftSubtitle(draft)}</p>
                <p className="text-xs text-slate-500">Updated {formatDateTime(draft.updatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-10" onClick={() => navigate(buildOnsiteRoute(draft.localOnsiteDraftId))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Open
                </Button>
                <Button className="h-10" onClick={() => openQuote(draft, "create")}>
                  Create Quote from Onsite Draft
                </Button>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => openQuote(draft, "resume")}
                  disabled={!draft.quoteResumeJobId}
                >
                  Resume in Quote Form
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() =>
                    downloadJsonFile(
                      `teamquo-onsite-${draft.localOnsiteDraftId}.json`,
                      createOnsiteDraftExportBundle([draft])
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={async () => {
                    if (!window.confirm("Delete this onsite draft from this device?")) return;
                    try {
                      await deleteOnsiteDraft(draft.localOnsiteDraftId);
                      await reload();
                      toast.success("Onsite draft deleted");
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to delete onsite draft");
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
