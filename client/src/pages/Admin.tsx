import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Trash2, Edit2, Plus, ArrowLeft } from "lucide-react";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showOperatorForm, setShowOperatorForm] = useState(false);
  const [editingOperatorId, setEditingOperatorId] = useState<number | null>(null);
  const [operatorName, setOperatorName] = useState("");

  // Operators queries and mutations
  const { data: operators, isLoading: operatorsLoading, refetch: refetchOperators } = trpc.operators.list.useQuery();
  
  const createOperatorMutation = trpc.operators.create.useMutation({
    onSuccess: () => {
      toast.success("Operator created successfully");
      setOperatorName("");
      setShowOperatorForm(false);
      refetchOperators();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateOperatorMutation = trpc.operators.update.useMutation({
    onSuccess: () => {
      toast.success("Operator updated successfully");
      setOperatorName("");
      setEditingOperatorId(null);
      setShowOperatorForm(false);
      refetchOperators();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteOperatorMutation = trpc.operators.delete.useMutation({
    onSuccess: () => {
      toast.success("Operator deleted successfully");
      refetchOperators();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Access denied. Admin only.</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleCreateOperator = () => {
    if (!operatorName.trim()) {
      toast.error("Please enter an operator name");
      return;
    }
    createOperatorMutation.mutate({ name: operatorName });
  };

  const handleUpdateOperator = () => {
    if (!operatorName.trim()) {
      toast.error("Please enter an operator name");
      return;
    }
    if (editingOperatorId === null) return;
    updateOperatorMutation.mutate({ id: editingOperatorId, name: operatorName });
  };

  const handleEditOperator = (id: number, name: string) => {
    setEditingOperatorId(id);
    setOperatorName(name);
    setShowOperatorForm(true);
  };

  const handleDeleteOperator = (id: number) => {
    if (window.confirm("Are you sure you want to delete this operator?")) {
      deleteOperatorMutation.mutate({ id });
    }
  };

  const handleCancel = () => {
    setShowOperatorForm(false);
    setEditingOperatorId(null);
    setOperatorName("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="p-0 h-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600 mt-2">Manage operators and system settings</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="operators" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="operators">Operators</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Operators Tab */}
          <TabsContent value="operators" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Team Operators</CardTitle>
                {!showOperatorForm && (
                  <Button
                    onClick={() => setShowOperatorForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Operator
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add/Edit Form */}
                {showOperatorForm && (
                  <Card className="bg-blue-50 border-blue-200 p-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="operatorName">Operator Name</Label>
                        <Input
                          id="operatorName"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          placeholder="Enter operator name"
                          className="mt-2"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={editingOperatorId !== null ? handleUpdateOperator : handleCreateOperator}
                          disabled={createOperatorMutation.isPending || updateOperatorMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {createOperatorMutation.isPending || updateOperatorMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          {editingOperatorId !== null ? "Update" : "Create"}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Operators List */}
                {operatorsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="animate-spin w-6 h-6" />
                  </div>
                ) : operators && operators.length > 0 ? (
                  <div className="space-y-3">
                    {operators.map((operator) => (
                      <Card key={operator.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{operator.name}</p>
                            <p className="text-sm text-gray-600">ID: {operator.id}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOperator(operator.id, operator.name)}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteOperator(operator.id)}
                              disabled={deleteOperatorMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deleteOperatorMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    No operators yet. Create one to get started!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Additional system settings and configuration options will appear here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
