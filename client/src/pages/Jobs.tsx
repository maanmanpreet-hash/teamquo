import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Loader2, Plus, Eye, FileText, Edit } from "lucide-react";
import { Link, useLocation } from "wouter";
import { downloadPDF } from "@/lib/pdf";
import { toast } from "sonner";

type JobStatus = "quoted" | "booked" | "commenced" | "completed" | "cancelled";

const statusColors: Record<JobStatus, string> = {
  quoted: "bg-blue-100 text-blue-800",
  booked: "bg-green-100 text-green-800",
  commenced: "bg-orange-100 text-orange-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Jobs() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "all">(
    "all"
  );
  const [selectedSuburb, setSelectedSuburb] = useState<string | "all">("all");
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null);

  const SUBURBS = [
    "Kalkallo",
    "Donnybrook",
    "Mickleham",
    "Craigieburn",
    "Beveridge",
  ];

  // Fetch jobs
  const { data: jobs, isLoading, refetch } = trpc.jobs.list.useQuery();

  // Update status mutation
  const updateStatusMutation = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // PDF generation mutation
  const generatePDFMutation = trpc.jobItems.generatePDF.useQuery(
    { jobId: downloadingJobId || 0 },
    { enabled: downloadingJobId !== null }
  );

  const handleDownloadPDF = async (jobId: number, clientName: string) => {
    try {
      setDownloadingJobId(jobId);
    } catch (error: any) {
      toast.error(error.message || "Failed to download PDF");
      setDownloadingJobId(null);
    }
  };

  // Watch for PDF data and download when ready
  useEffect(() => {
    if (downloadingJobId === null || !generatePDFMutation.data) return;

    const job = jobs?.find(j => j.id === downloadingJobId);
    downloadPDF(
      generatePDFMutation.data.html,
      `quote-${job?.clientName || "quote"}-${new Date().toISOString().split("T")[0]}.pdf`
    )
      .then(() => {
        toast.success("PDF downloaded successfully");
        setDownloadingJobId(null);
      })
      .catch(() => {
        toast.error("Failed to download PDF");
        setDownloadingJobId(null);
      });
  }, [downloadingJobId, generatePDFMutation.data, jobs]);

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
    ?.sort((a, b) => {
      // Sort by appointment date/time if available, then by creation date
      if (a.appointmentDate && b.appointmentDate) {
        const aTime = new Date(
          `${a.appointmentDate}T${a.appointmentTime || "00:00"}`
        );
        const bTime = new Date(
          `${b.appointmentDate}T${b.appointmentTime || "00:00"}`
        );
        return aTime.getTime() - bTime.getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Jobs Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Track and manage all your quotes
            </p>
          </div>
          <Link href="/quote">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </Link>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {statusCounts.quoted}
                </div>
                <div className="text-sm text-muted-foreground mt-2">Quoted</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {statusCounts.booked}
                </div>
                <div className="text-sm text-muted-foreground mt-2">Booked</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {statusCounts.commenced}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Commenced
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {statusCounts.completed}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Completed
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {statusCounts.cancelled}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Cancelled
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <Select
            value={selectedStatus}
            onValueChange={value =>
              setSelectedStatus(value as JobStatus | "all")
            }
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

        {/* Jobs List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs && filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {job.clientName === "[Draft]"
                            ? "📋 Draft Quote"
                            : job.clientName}
                        </h3>
                        <Badge
                          className={statusColors[job.status as JobStatus]}
                        >
                          {job.status}
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
                        {job.clientEmail && (
                          <div>
                            <span className="font-medium">Email:</span>{" "}
                            {job.clientEmail || "—"}
                          </div>
                        )}
                        {job.clientPhone && (
                          <div>
                            <span className="font-medium">Phone:</span>{" "}
                            {job.clientPhone || "—"}
                          </div>
                        )}
                        {job.suburb && (
                          <div>
                            <span className="font-medium">📍 Suburb:</span>{" "}
                            {job.suburb}
                          </div>
                        )}
                        {job.appointmentDate && (
                          <div>
                            <span className="font-medium">📅 Quote:</span>{" "}
                            {new Date(job.appointmentDate).toLocaleDateString()}{" "}
                            {job.appointmentTime && `@ ${job.appointmentTime}`}
                          </div>
                        )}
                        {job.operatorName && (
                          <div>
                            <span className="font-medium">Operator:</span>{" "}
                            {job.operatorName}
                          </div>
                        )}
                      </div>
                      {job.clientAddress && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Address:</span>{" "}
                          {job.clientAddress}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold">
                        ${(job.totalEstimate || 0) / 100}
                      </div>
                      <p className="text-sm text-muted-foreground">Estimate</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {job.clientName === "[Draft]" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          localStorage.setItem(
                            "selectedOperator",
                            job.operatorName || ""
                          );
                          navigate(`/stage1?resumeJobId=${job.id}`);
                        }}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Resume Draft
                      </Button>
                    )}
                  </div>

                  {/* Status Update Buttons */}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {job.status !== "quoted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: job.id,
                            status: "quoted",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark Quoted
                      </Button>
                    )}
                    {job.status !== "booked" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: job.id,
                            status: "booked",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark Booked
                      </Button>
                    )}
                    {job.status !== "commenced" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: job.id,
                            status: "commenced",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark Commenced
                      </Button>
                    )}
                    {job.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: job.id,
                            status: "completed",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark Completed
                      </Button>
                    )}
                    {job.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: job.id,
                            status: "cancelled",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadPDF(job.id, job.clientName)}
                      disabled={downloadingJobId === job.id}
                    >
                      {downloadingJobId === job.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      {downloadingJobId === job.id ? "Generating..." : "PDF"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-muted-foreground mb-4">No jobs found</p>
              <Link href="/quote">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Quote
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
