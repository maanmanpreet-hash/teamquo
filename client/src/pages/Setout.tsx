import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadPDF } from "@/lib/pdf";
import { trpc } from "@/lib/trpc";
import { formatQuoteNumber } from "@shared/quote";
import { calculateTvBackdropSetout } from "@shared/tvSetout";
import { generateTvBackdropSetoutHtml, type TvBackdropSetoutDocument } from "@shared/tvSetoutDocument";

type SetoutDocumentRecord = TvBackdropSetoutDocument & { id: string };

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

    return (wall.products || []).flatMap((product: any) => {
      if (product.itemType !== "tv_backdrop") return [];

      const details = parseItemDetails(product.itemDetails);
      const tvSizeInches = safeNumber(details.tvSizeInches);
      const backdropWidthMm = safeNumber(details.backdropWidthMm ?? details.backdrop_width_mm);
      const backdropHeightMm = safeNumber(details.backdropHeightMm ?? details.backdrop_height_mm);
      const tvBottomAfflMm = safeNumber(details.tvBottomAfflMm ?? details.tv_bottom_affl_mm);
      const cabinetBottomAfflMm =
        safeNumber(details.cabinetBottomAfflMm ?? details.cabinet_bottom_affl_mm ?? details.heightFromFloorMm) ??
        floatingCabinetBottomAfflMm;
      const cabinetHeightMm =
        safeNumber(details.cabinetHeightMm ?? details.cabinet_height_mm ?? details.heightMm) ??
        floatingCabinetHeightMm;
      const cabinetTopAfflMm = safeNumber(details.cabinetTopAfflMm ?? details.cabinet_top_affl_mm) ?? cabinetTopFromCabinet;
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
      await downloadPDF(
        generateTvBackdropSetoutHtml(selectedDocument),
        `${selectedDocument.quoteNumber}-${selectedDocument.wallName}-setout.pdf`
      );
      toast.success("Installer setout opened for print/PDF");
    } catch (error: any) {
      toast.error(error?.message || "Failed to open print/PDF view");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-4">
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/jobs")} className="h-9 w-9 p-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">TV Backdrop Setout</h1>
              <p className="text-sm text-slate-600">{selectedDocument ? `${selectedDocument.quoteNumber}  ${selectedDocument.clientName}` : "Installer elevation"}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {documents.length > 1 && selectedDocument && (
              <div className="w-full md:w-72">
                <Select value={selectedDocument.id} onValueChange={setSelectedDocumentId}>
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map(document => (
                      <SelectItem key={document.id} value={document.id}>
                        {document.wallName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleDownload} disabled={!selectedDocument || downloading || jobLoading || wallsLoading} className="h-10">
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Print / PDF
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          {jobLoading || wallsLoading ? (
            <div className="flex min-h-[70vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !job ? (
            <div className="p-6 text-sm text-slate-600">Job not found.</div>
          ) : documents.length === 0 || !selectedDocument ? (
            <div className="space-y-2 p-6 text-sm text-slate-600">
              <p>No TV backdrop setout is ready for this job yet.</p>
              <p>Save a TV backdrop with TV size, backdrop width/height, and cabinet or TV bottom install data.</p>
            </div>
          ) : (
            <iframe
              title={`${selectedDocument.wallName} setout preview`}
              srcDoc={previewHtml}
              className="h-[calc(100vh-8.5rem)] min-h-[980px] w-full bg-white"
            />
          )}
        </Card>
      </div>
    </div>
  );
}
