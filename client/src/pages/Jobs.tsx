import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Loader2, Plus, FileText, Edit } from "lucide-react";
import { Link, useLocation } from "wouter";
import { downloadPDF } from "@/lib/pdf";
import { toast } from "sonner";
import { formatMoneyFromCents, formatQuoteNumber } from "@shared/quote";

type JobStatus = "quoted" | "booked" | "commenced" | "completed" | "cancelled";

const statusColors: Record<JobStatus, string> = {
  quoted: "bg-blue-100 text-blue-800",
  booked: "bg-green-100 text-green-800",
  commenced: "bg-orange-100 text-orange-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<JobStatus, string> = {
  quoted: "Quoted",
  booked: "Booked",
  commenced: "Commenced",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatAppointmentDate(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

export default function Jobs() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "all">("all");
  const [selectedSuburb, setSelectedSuburb] = useState<string | "all">("all");
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null);
  const [updatingStatusJobId, setUpdatingStatusJobId] = useState<number | null>(null);

  const SUBURBS = [
    "Kalkallo",
    "Donnybrook",
    "Mickleham",
    "Craigieburn",
    "Beveridge",
  ];

  const { data: jobs, isLoading, refetch } = trpc.jobs.list.useQuery();
  const { data: operators } = trpc.operators.list.useQuery();

  const updateStatusMutation = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      setUpdatingStatusJobId(null);
      refetch();
      toast.success("Status updated");
    },
    onError: error => {
      setUpdatingStatusJobId(null);
      toast.error(error.message || "Failed to update status");
    },
  });

  const generatePDFMutation = trpc.jobItems.generatePDF.useQuery(
    { jobId: downloadingJobId || 0 },
    {
      enabled: downloadingJobId !== null,
      retry: false,
    }
  );

  const handleDownloadPDF = (jobId: number) => {
    setDownloadingJobId(jobId);
  };

  const startNewQuote = () => {
    const operatorId = operators?.[0]?.id?.toString();
    if (operatorId) {
      localStorage.setItem("selectedOperator", operatorId);
    } else {
      localStorage.removeItem("selectedOperator");
    }
    navigate("/quote");
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Please log in to view jobs
          </h1>
        </div>
      </div>
    );
  }

  const filteredJobs = jobs
    ?.filter(job => selectedStatus === "all" || job.status === selectedStatus)
    ?.filter(job => selectedSuburb === "all" || job.suburb === selectedSuburb)
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statusCounts = {
    quoted: jobs?.filter(j => j.status === "quoted").length || 0,
    booked: jobs?.filter(j => j.status === "booked").length || 0,
    commenced: jobs?.filter(j => j.status === "commenced").length || 0,
    completed: jobs?.filter(j => j.status === "completed").length || 0,
    cancelled: jobs?.filter(j => j.status === "cancelled").length || 0,
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Jobs Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Track Skywall Cabinets quote jobs, drafts, and follow-up work
            </p>
          </div>
          <Button onClick={startNewQuote}>
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Card key={status}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {statusLabels[status as JobStatus]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-6 flex gap-4 flex-wrap">
          <Select
            value={selectedStatus}
            onValueChange={value => setSelectedStatus(value as JobStatus | "all")}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="commenced">Commenced</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedSuburb}
            onValueChange={value => setSelectedSuburb(value as string)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by suburb..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suburbs</SelectItem>
              {SUBURBS.map(suburb => (
                <SelectItem key={suburb} value={suburb}>
                  {suburb}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs && filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div>
                          <p className="text-xs font-semibold text-blue-700">
                            {formatQuoteNumber(job)}
                          </p>
                          <h3 className="text-lg font-semibold">
                            {job.clientName === "[Draft]"
                              ? "Draft Quote"
                              : job.clientName}
                          </h3>
                        </div>
                        <Badge className={statusColors[job.status as JobStatus]}>
                          {statusLabels[job.status as JobStatus]}
                        </Badge>
                        {job.clientName === "[Draft]" && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-800 border-yellow-200"
                          >
                            Incomplete
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                        {job.clientEmail && <div><span className="font-medium">Email:</span> {job.clientEmail}</div>}
                        {job.clientPhone && <div><span className="font-medium">Phone:</span> {job.clientPhone}</div>}
                        {job.suburb && <div><span className="font-medium">Suburb:</span> {job.suburb}</div>}
                        {job.appointmentDate && (
                          <div>
                            <span className="font-medium">Quote:</span> {formatAppointmentDate(job.appointmentDate)} {job.appointmentTime && `@ ${job.appointmentTime}`}
                          </div>
                        )}
                        {job.operatorName && <div><span className="font-medium">Operator:</span> {job.operatorName}</div>}
                      </div>

                      {job.clientAddress && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Address:</span> {job.clientAddress}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold">
                        {formatMoneyFromCents(job.totalEstimate)}
                      </div>
                      <p className="text-sm text-muted-foreground">Estimate</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      disabled={downloadingJobId === job.id || updatingStatusJobId === job.id}
                      onClick={() => {
                        if (job.operatorName) {
                          const matchingOperator = operators?.find(operator => operator.name === job.operatorName);
                          localStorage.setItem("selectedOperator", matchingOperator ? String(matchingOperator.id) : job.operatorName);
                        }
                        navigate(`/quote?resumeJobId=${job.id}`);
                      }}
                      className={job.clientName === "[Draft]" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {job.clientName === "[Draft]" ? "Resume Draft" : "Edit Quote"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadPDF(job.id)}
                      disabled={downloadingJobId === job.id || updatingStatusJobId === job.id}
                    >
                      {downloadingJobId === job.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      {downloadingJobId === job.id ? "Generating..." : "PDF"}
                    </Button>

                    {(["quoted", "booked", "commenced", "completed", "cancelled"] as JobStatus[]).map(status =>
                      job.status !== status ? (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUpdatingStatusJobId(job.id);
                            updateStatusMutation.mutate({ id: job.id, status });
                          }}
                          disabled={downloadingJobId === job.id || updatingStatusJobId === job.id}
                        >
                          Mark {statusLabels[status]}
                        </Button>
                      ) : null
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-muted-foreground mb-4">No jobs found</p>
              <Button onClick={startNewQuote}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Quote
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
