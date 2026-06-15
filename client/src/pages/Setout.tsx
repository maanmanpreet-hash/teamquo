import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPdfPreview } from "@/lib/pdf";
import { trpc } from "@/lib/trpc";
import { formatQuoteNumber } from "@shared/quote";
import { calculateTvBackdropSetout } from "@shared/tvSetout";
import { generateTvBackdropSetoutHtml, type TvBackdropSetoutDocument } from "@shared/tvSetoutDocument";

type SetoutDocumentRecord = TvBackdropSetoutDocument & { id: string; selectorLabel: string };

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

function buildSetoutDocuments(job: any, walls: any[]): SetoutDocumentRecord[] {
  return walls.flatMap(wall => {
    const floatingCabinet = (wall.products || []).find((product: any) => product.itemType === "floating_cabinet");
    const floatingCabinetBottomAfflMm = safeNumber(floatingCabinet?.cabinetHeightFromFloorMm);
    const floatingCabinetHeightMm = safeNumber(floatingCabinet?.cabinetHeightMm);
    const cabinetTopFromCabinet =
      floatingCabinetBottomAfflMm !== undefined && floatingCabinetHeightMm !== undefined
        ? floatingCabinetBottomAfflMm + floatingCabinetHeightMm
        : undefined;

    let backdropIndex = 0;
    return (wall.products || []).flatMap((product: any) => {
      if (product.itemType !== "tv_backdrop") return [];
      backdropIndex += 1;

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

      if (!tvSizeInches || !backdropWidthMm || !backdropHeightMm || !wall.wallWidthMm || !wall.wallHeightMm) {
        return [];
      }

      try {
        const setout = calculateTvBackdropSetout({
          wallWidthMm: wall.wallWidthMm,
          wallHeightMm: wall.wallHeightMm,
          tvSizeInches,
          backdropWidthMm,
          backdropHeightMm,
          tvBottomAfflMm,
          cabinetBottomAfflMm,
          cabinetHeightMm,
          cabinetTopAfflMm,
          cabinetToTvGapMm,
        });

        return [
          {
            id: `${wall.id}-${product.id}`,
            selectorLabel: `${wall.wallName || "TV Wall"}${backdropIndex > 1 ? ` - TV Backdrop ${backdropIndex}` : ""}`,
            quoteNumber: formatQuoteNumber(job),
            clientName: job.clientName === "[Draft]" ? "Draft Quote" : job.clientName,
            wallName: wall.wallName || "TV Wall",
            generatedDateLabel: new Date().toLocaleDateString(),
            cabinetWidthMm: safeNumber(floatingCabinet?.cabinetWidthMm),
            cabinetHeightMm: setout.cabinetHeightMm,
            cabinetHeightFromFloorMm: setout.cabinetBottomAfflMm,
            setout,
          } satisfies SetoutDocumentRecord,
        ];
      } catch {
        return [];
      }
    });
  });
}

export default function Setout() {
  const [location, navigate] = useLocation();
  const [downloading, setDownloading] = useState(false);
  const jobId = Number(location.match(/^\/setout\/(\d+)$/)?.[1] || 0);
  const { user, loading: authLoading } = useAuth();

  const { data: job, isLoading: jobLoading } = trpc.jobs.getById.useQuery({ id: jobId }, { enabled: jobId > 0 && Boolean(user) });
  const { data: walls, isLoading: wallsLoading } = trpc.walls.getByJobId.useQuery({ jobId }, { enabled: jobId > 0 && Boolean(user) });

  const documents = useMemo(() => (job && walls ? buildSetoutDocuments(job, walls) : []), [job, walls]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const selectedDocument =
    documents.find(document => document.id === selectedDocumentId) ||
    documents[0];
  const previewHtml = useMemo(
    () => (selectedDocument ? generateTvBackdropSetoutHtml(selectedDocument) : ""),
    [selectedDocument]
  );

  useEffect(() => {
    if (!documents[0]) return;
    if (!documents.some(document => document.id === selectedDocumentId)) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);

  if (!jobId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-4 h-9">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card className="p-6">Invalid setout link.</Card>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 h-9">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">Sign-in required</h2>
            <p className="mt-2 text-sm text-slate-600">
              The installer setout is tied to saved Team QUO jobs, so the app needs a live session before it can load this page.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    if (!selectedDocument) return;
    setDownloading(true);
    try {
      const token = createPdfPreview(
        generateTvBackdropSetoutHtml(selectedDocument),
        `${selectedDocument.quoteNumber}-${selectedDocument.wallName}-setout.pdf`,
        `/setout/${jobId}`
      );
      navigate(`/print-preview/${token}`);
      toast.success("Installer setout opened in preview");
    } catch (error: any) {
      toast.error(error?.message || "Failed to open setout preview");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative h-screen bg-white">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <Button variant="outline" onClick={() => navigate("/jobs")} className="h-10 w-10 bg-white/95 p-0 shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {documents.length > 1 && selectedDocument && (
          <div className="w-64">
            <Select value={selectedDocument.id} onValueChange={setSelectedDocumentId}>
              <SelectTrigger className="h-10 bg-white/95 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documents.map(document => (
                  <SelectItem key={document.id} value={document.id}>
                    {document.selectorLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={handleDownload} disabled={!selectedDocument || downloading || jobLoading || wallsLoading} className="h-10 shadow-sm">
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Print / PDF
        </Button>
      </div>

      <Card className="h-full overflow-hidden rounded-none border-0 p-0 shadow-none">
          {jobLoading || wallsLoading ? (
            <div className="flex min-h-[70vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !job ? (
            <div className="p-6 text-sm text-slate-600">Job not found.</div>
          ) : documents.length === 0 || !selectedDocument ? (
            <div className="space-y-2 p-6 text-sm text-slate-600">
              <p>No TV backdrop setout is ready for this job yet.</p>
              <p>Save a TV backdrop on the selected wall with its current quote measurements and install inputs.</p>
            </div>
          ) : (
            <iframe
              title={`${selectedDocument.wallName} setout preview`}
              srcDoc={previewHtml}
              className="h-full w-full bg-white"
            />
          )}
      </Card>
    </div>
  );
}
