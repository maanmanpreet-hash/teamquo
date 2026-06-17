import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, Plus, FileText, Edit, Calendar, MapPin, Trash2, Copy, Ruler } from "lucide-react";
import { createPdfPreview } from "@/lib/pdf";
import { toast } from "sonner";
import { formatMoneyFromCents, formatQuoteNumber } from "@shared/quote";

type JobStatus = "quoted" | "booked" | "commenced" | "completed" | "cancelled";

const quoteStatusOrder: JobStatus[] = ["quoted", "booked", "commenced", "cancelled", "completed"];
const DASHBOARD_VIEW_MODE_KEY = "dashboard-view-mode";

const statusColors: Record<JobStatus, string> = {
  quoted: "bg-blue-100 text-blue-800 border-blue-300",
  booked: "bg-amber-100 text-amber-800 border-amber-300",
  commenced: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-purple-100 text-purple-800 border-purple-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels: Record<JobStatus, string> = {
  quoted: "Draft",
  booked: "Sent",
  commenced: "Accepted",
  completed: "Completed",
  cancelled: "Rejected",
};

function fallbackPdfHtml(job: any) {
  return `
    <main style="font-family:Arial,sans-serif;padding:32px;color:#111827">
      <header style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:24px">
        <img src="/skywall-brand.png" alt="Skywall Cabinets" style="height:72px;width:auto;object-fit:contain" />
        <div style="text-align:right"><h1 style="margin:0">Supply and Install Quote</h1><p>${formatQuoteNumber(job)}</p></div>
      </header>
      <h2>${job?.clientName || "Preview Client"}</h2>
      <p><b>Phone:</b> ${job?.clientPhone || ""}</p>
      <p><b>Address:</b> ${job?.clientAddress || ""}</p>
      <p><b>Suburb:</b> ${job?.suburb || ""}</p>
      <p><b>Operator:</b> ${job?.operatorName || ""}</p>
      <h2>Supply and Install Total Estimate: ${formatMoneyFromCents(job?.totalEstimate ?? 0)}</h2>
      <p>This fallback preview shows the single supply-and-install total only. Wall/product scope is shown when the server PDF route is available.</p>
    </main>
  `;
}

function safeFilePart(value: string | null | undefined) {
  return (value || "quote")
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-") || "quote";
}

function getStatusLabel(status: string | null | undefined) {
  return statusLabels[(status || "quoted") as JobStatus] || "Draft";
}

function getStatusColor(status: string | null | undefined) {
  return statusColors[(status || "quoted") as JobStatus] || statusColors.quoted;
}

function formatAppointmentDate(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function persistSelectedOperatorFromName(
  operatorName: string | null | undefined,
  operators: Array<{ id: number; name: string }> | undefined
) {
  if (!operatorName) return;
  const matchingOperator = operators?.find(operator => operator.name === operatorName);
  localStorage.setItem("selectedOperator", matchingOperator ? String(matchingOperator.id) : operatorName);
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [selectedOperator, setSelectedOperator] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">(() => {
    if (typeof window === "undefined") return "kanban";
    const saved = window.localStorage.getItem(DASHBOARD_VIEW_MODE_KEY);
    return saved === "list" ? "list" : "kanban";
  });
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null);
  const [downloadingJobPackId, setDownloadingJobPackId] = useState<number | null>(null);
  const [downloadingMaterialListJobId, setDownloadingMaterialListJobId] = useState<number | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [updatingStatusJobId, setUpdatingStatusJobId] = useState<number | null>(null);
  const [duplicatingJobId, setDuplicatingJobId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<JobStatus | "all">("all");

  const { data: operators, isLoading: operatorsLoading } = trpc.operators.list.useQuery();
  const { data: jobs, isLoading: jobsLoading, refetch } = trpc.jobs.list.useQuery();
  const pdfQuery = trpc.jobItems.generatePDF.useQuery(
    { jobId: downloadingJobId || 0 },
    { enabled: downloadingJobId !== null, retry: false }
  );
  const jobPackQuery = trpc.jobItems.generateJobPack.useQuery(
    { jobId: downloadingJobPackId || 0 },
    { enabled: downloadingJobPackId !== null, retry: false }
  );
  const materialListQuery = trpc.jobItems.generateMaterialList.useQuery(
    { jobId: downloadingMaterialListJobId || 0 },
    { enabled: downloadingMaterialListJobId !== null, retry: false }
  );

  const saveQuoteMutation = trpc.jobs.saveQuote.useMutation();

  const deleteJobMutation = trpc.jobs.delete.useMutation({
    onSuccess: () => {
      setDeletingJobId(null);
      refetch();
      toast.success("Quote deleted");
    },
    onError: error => {
      setDeletingJobId(null);
      toast.error(error.message || "Failed to delete quote");
    },
  });

  const updateStatusMutation = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      setUpdatingStatusJobId(null);
      refetch();
      toast.success("Quote status updated");
    },
    onError: error => {
      setUpdatingStatusJobId(null);
      toast.error(error.message || "Failed to update quote status");
    },
  });

  useEffect(() => {
    if (!operators || operators.length === 0) return;
    const saved = localStorage.getItem("selectedOperator");
    const validSaved = saved && operators.some(op => op.id.toString() === saved);
    const operatorId = validSaved ? saved : operators[0].id.toString();
    setSelectedOperator(operatorId);
    localStorage.setItem("selectedOperator", operatorId);
  }, [operators]);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (downloadingJobId === null) return;
    const job = jobs?.find(j => j.id === downloadingJobId);
    const fileName = `${formatQuoteNumber(job)}-supply-install-${safeFilePart(job?.clientName)}.pdf`;

    if (pdfQuery.data) {
      const token = createPdfPreview(pdfQuery.data.html, fileName, "/dashboard", {
        kind: "customer-quote",
        jobId: downloadingJobId,
      });
      navigate(`/print-preview/${token}`);
      toast.success("Supply-and-install quote opened in preview");
      setDownloadingJobId(null);
    }

    if (pdfQuery.error) {
      toast.error(pdfQuery.error.message || "Failed to generate supply-and-install quote preview");
      setDownloadingJobId(null);
    }
  }, [downloadingJobId, navigate, pdfQuery.data, pdfQuery.error, jobs]);

  useEffect(() => {
    if (downloadingJobPackId === null) return;
    const job = jobs?.find(j => j.id === downloadingJobPackId);
    const fileName = `${formatQuoteNumber(job)}-job-pack-${safeFilePart(job?.clientName)}.pdf`;

    if (jobPackQuery.data) {
      const token = createPdfPreview(jobPackQuery.data.html, fileName, "/dashboard");
      navigate(`/print-preview/${token}`);
      toast.success("Installer job pack opened in preview");
      setDownloadingJobPackId(null);
    }

    if (jobPackQuery.error) {
      toast.error(jobPackQuery.error.message || "Failed to generate job pack");
      setDownloadingJobPackId(null);
    }
  }, [downloadingJobPackId, jobPackQuery.data, jobPackQuery.error, jobs, navigate]);

  useEffect(() => {
    if (downloadingMaterialListJobId === null) return;
    const job = jobs?.find(j => j.id === downloadingMaterialListJobId);
    const fileName = `${formatQuoteNumber(job)}-materials-${safeFilePart(job?.clientName)}.pdf`;

    if (materialListQuery.data) {
      const token = createPdfPreview(materialListQuery.data.html, fileName, "/dashboard");
      navigate(`/print-preview/${token}`);
      toast.success("Internal material list opened in preview");
      setDownloadingMaterialListJobId(null);
    }

    if (materialListQuery.error) {
      toast.error(materialListQuery.error.message || "Failed to generate material list");
      setDownloadingMaterialListJobId(null);
    }
  }, [downloadingMaterialListJobId, materialListQuery.data, materialListQuery.error, jobs, navigate]);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }
  if (!user) return null;

  const filteredJobs = jobs?.filter(job => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      job.clientName.toLowerCase().includes(q) ||
      (job.clientPhone || "").includes(searchQuery) ||
      (job.suburb || "").toLowerCase().includes(q) ||
      formatQuoteNumber(job).toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const jobsByStatus: Record<JobStatus, typeof filteredJobs> = {
    quoted: filteredJobs.filter(j => j.status === "quoted"),
    booked: filteredJobs.filter(j => j.status === "booked"),
    commenced: filteredJobs.filter(j => j.status === "commenced"),
    completed: filteredJobs.filter(j => j.status === "completed"),
    cancelled: filteredJobs.filter(j => j.status === "cancelled"),
  };

  const startNewQuote = () => {
    const operatorId = selectedOperator || operators?.[0]?.id?.toString();
    if (operatorId) {
      localStorage.setItem("selectedOperator", operatorId);
    } else {
      localStorage.removeItem("selectedOperator");
    }
    navigate("/quote");
  };

  const updateQuoteStatus = (jobId: number, status: JobStatus) => {
    setUpdatingStatusJobId(jobId);
    updateStatusMutation.mutate({ id: jobId, status });
  };

  const duplicateQuote = async (job: NonNullable<typeof jobs>[number]) => {
    setDuplicatingJobId(job.id);

    try {
      const sourceWalls = await utils.walls.getByJobId.fetch({ jobId: job.id });
      const duplicatedJob = await saveQuoteMutation.mutateAsync({
        clientName: job.clientName === "[Draft]" ? undefined : job.clientName,
        clientEmail: job.clientEmail || undefined,
        clientPhone: job.clientPhone || undefined,
        clientAddress: job.clientAddress || undefined,
        suburb: job.suburb || undefined,
        appointmentDate: job.appointmentDate ? new Date(job.appointmentDate).toISOString().slice(0, 10) : undefined,
        appointmentTime: job.appointmentTime || undefined,
        referenceImageUrl: job.referenceImageUrl || undefined,
        operatorName: job.operatorName || undefined,
        totalEstimate: job.totalEstimate ?? 0,
        notes: job.notes || undefined,
        walls: (sourceWalls || []).map((wall: any) => ({
          wallType: wall.wallType as "regular" | "garage" | "custom",
          wallName: wall.wallName || undefined,
          wallWidthMm: wall.wallWidthMm || undefined,
          wallHeightMm: wall.wallHeightMm || undefined,
          notes: wall.notes || undefined,
          products: (wall.products || []).map((item: any) => ({
            itemType: item.itemType,
            productId: item.productId || undefined,
            claddingVariantId: item.claddingVariantId || undefined,
            wallWidthMm: item.wallWidthMm || wall.wallWidthMm || undefined,
            wallHeightMm: item.wallHeightMm || wall.wallHeightMm || undefined,
            cabinetWidthMm: item.cabinetWidthMm || undefined,
            cabinetHeightMm: item.cabinetHeightMm || undefined,
            cabinetDepthMm: item.cabinetDepthMm || undefined,
            cabinetHeightFromFloorMm: item.cabinetHeightFromFloorMm ?? undefined,
            quantityRequired: item.quantityRequired || undefined,
            unitPrice: item.unitPrice ?? undefined,
            totalPrice: item.totalPrice ?? undefined,
            manualPriceOverride: item.manualPriceOverride ?? undefined,
            itemDetails: item.itemDetails || undefined,
          })),
        })),
      });

      const newJobId = duplicatedJob?.id;
      if (!newJobId) throw new Error("Duplicated quote could not be created");

      await refetch();
      setDuplicatingJobId(null);
      persistSelectedOperatorFromName(job.operatorName, operators);
      toast.success("Quote duplicated as Draft");
      navigate(`/quote?resumeJobId=${newJobId}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to duplicate quote");
      setDuplicatingJobId(null);
    }
  };

  const deleteQuote = (jobId: number) => {
    if (!window.confirm("Remove this quote?")) return;
    setDeletingJobId(jobId);
    deleteJobMutation.mutate({ id: jobId });
  };

  const startQuotePdf = (job: NonNullable<typeof jobs>[number]) => {
    setDownloadingJobId(job.id);
  };

  const startJobPackPdf = (job: NonNullable<typeof jobs>[number]) => {
    setDownloadingJobPackId(job.id);
  };

  const startMaterialListPdf = (job: NonNullable<typeof jobs>[number]) => {
    setDownloadingMaterialListJobId(job.id);
  };

  const jobCard = (job: NonNullable<typeof jobs>[number], compact = false) => {
    const currentStatus = (job.status || "quoted") as JobStatus;
    const isUpdatingStatus = updatingStatusJobId === job.id;
    const isDuplicating = duplicatingJobId === job.id;
    const isDeleting = deletingJobId === job.id;
    const isDownloading = downloadingJobId === job.id;
    const isDownloadingJobPack = downloadingJobPackId === job.id;
    const isDownloadingMaterialList = downloadingMaterialListJobId === job.id;
    const actionBusy = isUpdatingStatus || isDuplicating || isDeleting || isDownloading || isDownloadingJobPack || isDownloadingMaterialList;

    return (
      <Card key={job.id} className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700">{formatQuoteNumber(job)}</p>
              <p className="font-semibold text-gray-900 truncate">{job.clientName === "[Draft]" ? "Draft Quote" : job.clientName}</p>
              <p className="text-sm text-gray-600">{job.clientPhone || "No phone"}</p>
            </div>
            <Badge className={getStatusColor(job.status)}>{getStatusLabel(job.status)}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
            {job.suburb && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{job.suburb}</span></div>}
            {job.appointmentDate && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{formatAppointmentDate(job.appointmentDate)}</span></div>}
            {!compact && job.operatorName && <div><span className="font-medium">Operator:</span> {job.operatorName}</div>}
            {!compact && <div className="font-semibold text-gray-900">Supply & Install Total: {formatMoneyFromCents(job.totalEstimate ?? 0)}</div>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Status</span>
            <Select value={currentStatus} onValueChange={value => updateQuoteStatus(job.id, value as JobStatus)} disabled={actionBusy}>
              <SelectTrigger className="h-9 flex-1 bg-white text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{quoteStatusOrder.map(status => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent>
            </Select>
            {isUpdatingStatus && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                persistSelectedOperatorFromName(job.operatorName, operators);
                navigate(`/quote/${job.id}`);
              }}
              disabled={actionBusy}
              className="h-9 text-xs"
            >
              <Edit className="w-3 h-3 mr-1" />
              {job.clientName === "[Draft]" ? "Resume" : "Edit"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => duplicateQuote(job)} disabled={actionBusy} className="h-9 text-xs">{isDuplicating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Copy className="w-3 h-3 mr-1" />}Duplicate</Button>
            <Button size="sm" variant="outline" onClick={() => startQuotePdf(job)} disabled={actionBusy} className="h-9 text-xs">{isDownloading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}Quote PDF</Button>
            <Button size="sm" variant="outline" onClick={() => startJobPackPdf(job)} disabled={actionBusy} className="h-9 text-xs">{isDownloadingJobPack ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}Job Pack</Button>
            <Button size="sm" variant="outline" onClick={() => startMaterialListPdf(job)} disabled={actionBusy} className="h-9 text-xs">{isDownloadingMaterialList ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}Materials</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/setout/${job.id}`)} disabled={actionBusy} className="h-9 text-xs"><Ruler className="w-3 h-3 mr-1" />Setout</Button>
            <Button size="sm" variant="outline" onClick={() => deleteQuote(job.id)} disabled={actionBusy} className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">{isDeleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}Delete</Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <img src="/skywall-brand.png" alt="Skywall Cabinets" className="h-16 md:h-20 w-auto object-contain" />
            </div>
            <Button onClick={startNewQuote} disabled={operatorsLoading} className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6"><Plus className="w-4 h-4 mr-2" />New Quote</Button>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Operator:</label>
            <Select value={selectedOperator} onValueChange={value => { setSelectedOperator(value); localStorage.setItem("selectedOperator", value); }}>
              <SelectTrigger className="w-56 h-10 bg-white"><SelectValue placeholder="Select operator..." /></SelectTrigger>
              <SelectContent>{operatorsLoading ? <div className="p-2 text-center text-gray-500">Loading...</div> : operators && operators.length > 0 ? operators.map(op => <SelectItem key={op.id} value={op.id.toString()}>{op.name}</SelectItem>) : <div className="p-2 text-center text-gray-500">No operators</div>}</SelectContent>
            </Select>
            {selectedOperator && <Badge className="bg-blue-100 text-blue-800">{operators?.find(op => op.id.toString() === selectedOperator)?.name}</Badge>}
          </div>
        </div>
        <div className="mb-6 flex gap-4 flex-wrap">
          <input type="text" placeholder="Search by quote number, name, phone, or suburb..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 min-w-64 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <Select value={filterStatus} onValueChange={value => setFilterStatus(value as JobStatus | "all")}>
            <SelectTrigger className="w-44 h-10 bg-white"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Statuses</SelectItem>{quoteStatusOrder.map(status => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 mb-6"><Button variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")} className="h-10">Kanban View</Button><Button variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")} className="h-10">List View</Button></div>
        {viewMode === "kanban" && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">{quoteStatusOrder.map(status => <div key={status} className="flex flex-col"><div className={`${statusColors[status]} rounded-t-lg p-4 border-b-2 border-current`}><h3 className="font-semibold text-lg">{statusLabels[status]}</h3><p className="text-sm opacity-75">{jobsByStatus[status]?.length || 0} quotes</p></div><div className="flex-1 bg-gray-100 rounded-b-lg p-4 space-y-3 min-h-96">{jobsLoading ? <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin w-6 h-6 text-gray-400" /></div> : jobsByStatus[status]?.length === 0 ? <div className="text-center text-gray-400 py-8">No quotes</div> : jobsByStatus[status]?.map(job => jobCard(job, true))}</div></div>)}</div>}
        {viewMode === "list" && <div className="space-y-4">{jobsLoading ? <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin w-8 h-8" /></div> : filteredJobs.length > 0 ? filteredJobs.map(job => jobCard(job)) : <div className="text-center py-12"><p className="text-gray-600">No quotes yet. Start by creating a new quote.</p></div>}</div>}
        {user.role === "admin" && <div className="mt-12 pt-8 border-t"><Button onClick={() => navigate("/admin")} variant="outline" className="h-10">Admin Panel</Button></div>}
      </div>
    </div>
  );
}
