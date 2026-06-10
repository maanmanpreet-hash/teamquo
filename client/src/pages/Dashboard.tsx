import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, Plus, FileText, Edit, Calendar, MapPin } from "lucide-react";
import { downloadPDF } from "@/lib/pdf";
import { toast } from "sonner";
import { formatMoneyFromCents, formatQuoteNumber } from "@shared/quote";

type JobStatus = "quoted" | "booked" | "commenced" | "completed" | "cancelled";

const statusColors: Record<JobStatus, string> = {
  quoted: "bg-blue-100 text-blue-800 border-blue-300",
  booked: "bg-green-100 text-green-800 border-green-300",
  commenced: "bg-orange-100 text-orange-800 border-orange-300",
  completed: "bg-purple-100 text-purple-800 border-purple-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels: Record<JobStatus, string> = {
  quoted: "Quoted",
  booked: "Booked",
  commenced: "Commenced",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<JobStatus | "all">("all");

  const { data: operators, isLoading: operatorsLoading } =
    trpc.operators.list.useQuery();
  const {
    data: jobs,
    isLoading: jobsLoading,
    refetch,
  } = trpc.jobs.list.useQuery();

  const generatePDFMutation = trpc.jobItems.generatePDF.useQuery(
    { jobId: downloadingJobId || 0 },
    {
      enabled: downloadingJobId !== null,
      retry: false,
    }
  );

  const updateStatusMutation = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status updated");
    },
  });

  useEffect(() => {
    if (!operators || operators.length === 0) return;
    const saved = localStorage.getItem("selectedOperator");
    const savedExists = saved && operators.some(op => op.id.toString() === saved);
    const operatorId = savedExists ? saved : operators[0].id.toString();
    setSelectedOperator(operatorId);
    localStorage.setItem("selectedOperator", operatorId);
  }, [operators]);

  const handleOperatorSelect = (operatorId: string) => {
    setSelectedOperator(operatorId);
    localStorage.setItem("selectedOperator", operatorId);
  };

  const handleStartQuoting = () => {
    if (!selectedOperator) {
      toast.error("Please select an operator first");
      return;
    }
    navigate("/quote");
  };

  const handleDownloadPDF = (jobId: number) => {
    setDownloadingJobId(jobId);
  };

  useEffect(() => {
    if (downloadingJobId === null) return;

    if (generatePDFMutation.error) {
      toast.error(generatePDFMutation.error.message || "Failed to generate PDF");
      setDownloadingJobId(null);
      return;
    }

    if (!generatePDFMutation.data) return;

    const job = jobs?.find(j => j.id === downloadingJobId);
    downloadPDF(
      generatePDFMutation.data.html,
      `${formatQuoteNumber(job)}-${job?.clientName || "quote"}.pdf`
    )
      .then(() => {
        toast.success("PDF downloaded successfully");
        setDownloadingJobId(null);
      })
      .catch(() => {
        toast.error("Failed to download PDF");
        setDownloadingJobId(null);
      });
  }, [downloadingJobId, generatePDFMutation.data, generatePDFMutation.error, jobs]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) return null;

  const filteredJobs =
    jobs?.filter(job => {
      const matchesSearch =
        searchQuery === "" ||
        job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.clientPhone && job.clientPhone.includes(searchQuery)) ||
        (job.suburb &&
          job.suburb.toLowerCase().includes(searchQuery.toLowerCase())) ||
        formatQuoteNumber(job).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || job.status === filterStatus;
      return matchesSearch && matchesStatus;
    }) || [];

  const jobsByStatus: Record<JobStatus, typeof filteredJobs> = {
    quoted: filteredJobs.filter(j => j.status === "quoted") || [],
    booked: filteredJobs.filter(j => j.status === "booked") || [],
    commenced: filteredJobs.filter(j => j.status === "commenced") || [],
    completed: filteredJobs.filter(j => j.status === "completed") || [],
    cancelled: filteredJobs.filter(j => j.status === "cancelled") || [],
  };

  const statuses: JobStatus[] = ["quoted", "booked", "commenced", "completed"];

  const renderJobCard = (job: NonNullable<typeof jobs>[number], compact = false) => (
    <Card key={job.id} className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-700">
              {formatQuoteNumber(job)}
            </p>
            <p className="font-semibold text-gray-900 truncate">
              {job.clientName === "[Draft]" ? "Draft Quote" : job.clientName}
            </p>
            <p className="text-sm text-gray-600">{job.clientPhone || "No phone"}</p>
          </div>
          <Badge className={statusColors[job.status as JobStatus]}>
            {statusLabels[job.status as JobStatus]}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
          {job.suburb && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{job.suburb}</span>
            </div>
          )}
          {job.appointmentDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(job.appointmentDate).toLocaleDateString()}</span>
            </div>
          )}
          {!compact && job.operatorName && (
            <div>
              <span className="font-medium">Operator:</span> {job.operatorName}
            </div>
          )}
          {!compact && (
            <div className="font-semibold text-gray-900">
              Estimate: {formatMoneyFromCents(job.totalEstimate)}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/quote?resumeJobId=${job.id}`)}
            className="flex-1 h-9 text-xs"
          >
            <Edit className="w-3 h-3 mr-1" />
            {job.clientName === "[Draft]" ? "Resume" : "Edit"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadPDF(job.id)}
            disabled={downloadingJobId === job.id}
            className="flex-1 h-9 text-xs"
          >
            {downloadingJobId === job.id ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <FileText className="w-3 h-3 mr-1" />
            )}
            PDF
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                TeamQuo Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Internal quoting for SKYWALL Cabinets & Interior Cladding
              </p>
            </div>
            <Button
              onClick={handleStartQuoting}
              disabled={!selectedOperator || operatorsLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Operator:</label>
            <Select value={selectedOperator} onValueChange={handleOperatorSelect}>
              <SelectTrigger className="w-56 h-10 bg-white">
                <SelectValue placeholder="Select operator..." />
              </SelectTrigger>
              <SelectContent>
                {operatorsLoading ? (
                  <div className="p-2 text-center text-gray-500">Loading...</div>
                ) : operators && operators.length > 0 ? (
                  operators.map(op => (
                    <SelectItem key={op.id} value={op.id.toString()}>
                      {op.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-gray-500">No operators</div>
                )}
              </SelectContent>
            </Select>
            {selectedOperator && (
              <Badge className="bg-blue-100 text-blue-800">
                {operators?.find(op => op.id.toString() === selectedOperator)?.name}
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search by quote number, name, phone, or suburb..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select
            value={filterStatus}
            onValueChange={value => setFilterStatus(value as JobStatus | "all")}
          >
            <SelectTrigger className="w-44 h-10 bg-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="commenced">Commenced</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            onClick={() => setViewMode("kanban")}
            className="h-10"
          >
            Kanban View
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
            className="h-10"
          >
            List View
          </Button>
        </div>

        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statuses.map(status => (
              <div key={status} className="flex flex-col">
                <div className={`${statusColors[status]} rounded-t-lg p-4 border-b-2 border-current`}>
                  <h3 className="font-semibold text-lg">{statusLabels[status]}</h3>
                  <p className="text-sm opacity-75">{jobsByStatus[status]?.length || 0} jobs</p>
                </div>
                <div className="flex-1 bg-gray-100 rounded-b-lg p-4 space-y-3 min-h-96">
                  {jobsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
                    </div>
                  ) : jobsByStatus[status]?.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">No jobs</div>
                  ) : (
                    jobsByStatus[status]?.map(job => renderJobCard(job, true))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === "list" && (
          <div className="space-y-4">
            {jobsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin w-8 h-8" />
              </div>
            ) : filteredJobs && filteredJobs.length > 0 ? (
              filteredJobs.map(job => renderJobCard(job))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No jobs yet. Start by creating a new quote.</p>
              </div>
            )}
          </div>
        )}

        {user.role === "admin" && (
          <div className="mt-12 pt-8 border-t">
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              className="h-10"
            >
              Admin Panel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
