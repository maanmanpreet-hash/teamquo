import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  
  const { data: operators, isLoading: operatorsLoading } = trpc.operators.list.useQuery();

  useEffect(() => {
    // Load selected operator from localStorage
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
      alert("Please select an operator first");
      return;
    }
    navigate("/stage1");
  };

  const handleViewJobs = () => {
    navigate("/jobs");
  };

  const handleAdminPanel = () => {
    navigate("/admin");
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-lg flex items-center justify-center">
              <span className="text-4xl font-bold text-blue-600">CC</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Cladding Quote</h1>
          <p className="text-lg text-gray-600">Professional Job Quoting Platform</p>
        </div>

        {/* Operator Selection Card */}
        <Card className="mb-8 p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Who is performing this action?</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Operator
            </label>
            <Select value={selectedOperator} onValueChange={handleOperatorSelect}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder="Choose an operator..." />
              </SelectTrigger>
              <SelectContent>
                {operatorsLoading ? (
                  <div className="p-2 text-center text-gray-500">Loading operators...</div>
                ) : operators && operators.length > 0 ? (
                  operators.map((op) => (
                    <SelectItem key={op.id} value={op.id.toString()}>
                      {op.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-gray-500">No operators available</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedOperator && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>Selected Operator:</strong> {operators?.find(op => op.id.toString() === selectedOperator)?.name}
              </p>
            </div>
          )}
        </Card>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={handleStartQuoting}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quick Quote</h3>
              <p className="text-gray-600 mb-6">Start creating a new job quote on site</p>
              <Button 
                onClick={handleStartQuoting}
                disabled={!selectedOperator}
                className="w-full h-12 text-base"
              >
                Begin Stage 1
              </Button>
            </div>
          </Card>

          <Card className="p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={handleViewJobs}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Jobs</h3>
              <p className="text-gray-600 mb-6">View all jobs and their current status</p>
              <Button 
                onClick={handleViewJobs}
                variant="outline"
                className="w-full h-12 text-base"
              >
                View Dashboard
              </Button>
            </div>
          </Card>
        </div>

        {/* Admin Section */}
        {user.role === "admin" && (
          <Card className="p-8 shadow-lg border-2 border-amber-200 bg-amber-50">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Panel</h3>
              <p className="text-gray-600 mb-6">Manage operators, products, and system settings</p>
              <Button 
                onClick={handleAdminPanel}
                variant="outline"
                className="w-full h-12 text-base border-amber-300 hover:bg-amber-100"
              >
                Access Admin
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
