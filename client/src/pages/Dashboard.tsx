import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, Plus, Eye, FileText, Edit, Calendar, MapPin } from "lucide-react";
import { downloadPDF } from "@/lib/pdf";
import { toast } from "sonner";

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

  const { data: operators, isLoading: operatorsLoading } = trpc.operators.list.useQuery();
  const { data: jobs, isLoading: jobsLoading, refetch } = trpc.jobs.list.useQuery();

  // PDF generation mutation
  const generatePDFMutation = trpc.jobItems.generatePDF.useQuery(
    { jobId: downloadingJobId || 0 },
    { enabled: downloadingJobId !== null }
  );

  // Update status mutation
  const updateStatusMutation = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status updated");
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem("selectedOperator");
    if (saved) {
      setSelectedOperator(saved);
    }
  }, []);

  const handleOperatorSelect = (operatorId: string) => {
    setSelectedOperator(operatorId);
    localStorage.setItem("selectedOperator", operatorId);
  };

  const handleStartQuoting = () => {
    if (!selectedOperator) {
      toast.error("Please select an operator first");
      return;
    }
    navigate("/stage1");
  };

  const handleDownloadPDF = async (jobId: number, clientName: string) => {
    try {
      setDownloadingJobId(jobId);
    } catch (error: any) {
      toast.error(error.message || "Failed to download PDF");
      setDownloadingJobId(null);
    }
  };

  // Watch for PDF data and download when ready
  if (downloadingJobId !== null && generatePDFMutation.data) {
    try {
      const job = jobs?.find((j) => j.id === downloadingJobId);
      downloadPDF(
        generatePDFMutation.data.html,
        `quote-${job?.clientName || "quote"}-${new Date().toISOString().split('T')[0]}.pdf`
      ).then(() => {
        toast.success("PDF downloaded successfully");
        setDownloadingJobId(null);
      }).catch((error) => {
        toast.error("Failed to download PDF");
        setDownloadingJobId(null);
      });
    } catch (error) {
      toast.error("Failed to process PDF");
      setDownloadingJobId(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Group jobs by status
  const jobsByStatus: Record<JobStatus, typeof jobs> = {
    quoted: jobs?.filter(j => j.status === "quoted") || [],
    booked: jobs?.filter(j => j.status === "booked") || [],
    commenced: jobs?.filter(j => j.status === "commenced") || [],
    completed: jobs?.filter(j => j.status === "completed") || [],
    cancelled: jobs?.filter(j => j.status === "cancelled") || [],
  };

  const statuses: JobStatus[] = ["quoted", "booked", "commenced", "completed"];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">TeamQuo Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your job quotes and track progress</p>
            </div>
            <Button
              onClick={handleStartQuoting}
              disabled={!selectedOperator}
              className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </div>

          {/* Operator Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Operator:</label>
            <Select value={selectedOperator} onValueChange={handleOperatorSelect}>
              <SelectTrigger className="w-48 h-10">
                <SelectValue placeholder="Select operator..." />
              </SelectTrigger>
              <SelectContent>
                {operatorsLoading ? (
                  <div className="p-2 text-center text-gray-500">Loading...</div>
                ) : operators && operators.length > 0 ? (
                  operators.map((op) => (
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

        {/* View Mode Toggle */}
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

        {/* Kanban Board */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statuses.map((status) => (
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
                    jobsByStatus[status]?.map((job) => (
                      <Card
                        key={job.id}
                        className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4"
                        style={{
                          borderLeftColor: statusColors[status as JobStatus].split(" ")[0].replace("bg-", ""),
                        }}
                      >
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold text-gray-900 truncate">{job.clientName}</p>
                            <p className="text-sm text-gray-600">{job.clientPhone}</p>
                          </div>

                          {job.suburb && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{job.suburb}</span>
                            </div>
                          )}

                          {job.appointmentDate && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(job.appointmentDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/stage1?resumeJobId=${job.id}`)}
                              className="flex-1 h-8 text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(job.id, job.clientName)}
                              disabled={downloadingJobId === job.id}
                              className="flex-1 h-8 text-xs"
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
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {jobsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin w-8 h-8" />
              </div>
            ) : jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{job.clientName}</p>
                          <p className="text-sm text-gray-600">{job.clientPhone}</p>
                        </div>
                        <Badge className={statusColors[job.status as JobStatus]}>
                          {statusLabels[job.status as JobStatus]}
                        </Badge>
                        {job.suburb && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {job.suburb}
                          </div>
                        )}
                        {job.appointmentDate && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {new Date(job.appointmentDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/stage1?resumeJobId=${job.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(job.id, job.clientName)}
                        disabled={downloadingJobId === job.id}
                      >
                        {downloadingJobId === job.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <FileText className="w-4 h-4 mr-1" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No jobs yet. Start by creating a new quote!</p>
              </div>
            )}
          </div>
        )}

        {/* Admin Section */}
        {user.role === "admin" && (
          <div className="mt-12 pt-8 border-t">
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              className="h-10"
            >
              ⚙️ Admin Panel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
