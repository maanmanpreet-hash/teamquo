import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ElevationCanvasPage } from "@/components/elevation/ElevationCanvasPage";
import { createPdfPreview } from "@/lib/pdf";
import { trpc } from "@/lib/trpc";
import { buildElevationDocuments, type ElevationDocumentRecord } from "@shared/elevationJobDocuments";
import { renderElevationDocumentHtml } from "@shared/elevationRenderer";

export default function Setout() {
  const [location, navigate] = useLocation();
  const [downloading, setDownloading] = useState(false);
  const jobId = Number(location.match(/^\/setout\/(\d+)$/)?.[1] || 0);
  const { user, loading: authLoading } = useAuth();

  const { data: job, isLoading: jobLoading } = trpc.jobs.getById.useQuery({ id: jobId }, { enabled: jobId > 0 && Boolean(user) });
  const { data: walls, isLoading: wallsLoading } = trpc.walls.getByJobId.useQuery({ jobId }, { enabled: jobId > 0 && Boolean(user) });

  const { documents, generationError } = useMemo(() => {
    if (!job || !walls) {
      return { documents: [] as ElevationDocumentRecord[], generationError: "" };
    }

    try {
      return { documents: buildElevationDocuments(job, walls), generationError: "" };
    } catch (error: any) {
      return {
        documents: [] as ElevationDocumentRecord[],
        generationError: error?.message || "Setout generation failed.",
      };
    }
  }, [job, walls]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const selectedDocument =
    documents.find(document => document.id === selectedDocumentId) ||
    documents[0];
  const elevationDocument = selectedDocument?.document ?? null;

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
        renderElevationDocumentHtml(selectedDocument.document),
        selectedDocument.fileName,
        `/setout/${jobId}`
      );
      navigate(`/print-preview/${token}`);
      toast.success("Elevation opened in preview");
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
          ) : generationError ? (
            <div className="space-y-2 p-6 text-sm text-slate-600">
              <p>Setout could not be prepared for this job.</p>
              <p>{generationError}</p>
            </div>
          ) : documents.length === 0 || !selectedDocument ? (
            <div className="space-y-2 p-6 text-sm text-slate-600">
              <p>No elevation document is ready for this job yet.</p>
              <p>Save a TV backdrop or floating cabinet with its current quote measurements and install inputs.</p>
            </div>
          ) : (
            elevationDocument && (
              <div className="h-full overflow-auto bg-slate-100 p-4">
                <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
                  {elevationDocument.pages.map((page, pageIndex) => (
                    <Card key={page.id} className="overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
                      <ElevationCanvasPage document={elevationDocument} pageIndex={pageIndex} />
                    </Card>
                  ))}
                </div>
              </div>
            )
          )}
      </Card>
    </div>
  );
}
