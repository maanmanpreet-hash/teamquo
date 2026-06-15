import { ArrowLeft, Printer } from "lucide-react";
import { useMemo, useRef } from "react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPrintHtml, clearPdfPreview, readPdfPreview } from "@/lib/pdf";

export default function PdfPreview() {
  const [location, navigate] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const match = location.match(/^\/print-preview\/([^/?#]+)/);
  const token = match?.[1] || "";
  const payload = readPdfPreview(token);

  const previewDocument = useMemo(() => {
    if (!payload) return "";
    return buildPrintHtml(payload.html, payload.filename);
  }, [payload]);

  const handleBack = () => {
    if (token) clearPdfPreview(token);
    navigate(payload?.backPath || "/dashboard");
  };

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <p className="text-sm text-slate-600">This PDF preview is no longer available.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4">
              Back to dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <div className="flex items-center justify-between gap-3 border-b bg-white px-3 py-3 shadow-sm">
        <Button variant="outline" onClick={handleBack} className="h-10">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-medium text-slate-900">{payload.filename}</p>
          <p className="text-xs text-slate-500">Preview and print without opening a popup window.</p>
        </div>
        <Button onClick={handlePrint} className="h-10">
          <Printer className="mr-2 h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>

      <div className="flex-1 p-3 md:p-4">
        <Card className="h-full overflow-hidden border-slate-200 p-0 shadow-sm">
          <iframe ref={iframeRef} title={payload.filename} srcDoc={previewDocument} className="h-full w-full bg-white" />
        </Card>
      </div>
    </div>
  );
}
