import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

export default function Stage1QuotingWorkspace() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTab, setCurrentTab] = useState("client");

  // Client Details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Product Selection
  const [productType, setProductType] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedDimension, setSelectedDimension] = useState("");
  const [customDimension, setCustomDimension] = useState("");
  const [useCustomDimension, setUseCustomDimension] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [priceOverride, setPriceOverride] = useState("");

  // Wall Dimensions
  const [wallWidth, setWallWidth] = useState("");
  const [wallHeight, setWallHeight] = useState("");

  // Queries
  const { data: products } = trpc.cladding.list.useQuery();
  const { data: operators } = trpc.operators.list.useQuery();
  const createJobMutation = trpc.jobs.create.useMutation();
  const createJobItemMutation = trpc.jobItems.create.useMutation();

  const selectedOperator = localStorage.getItem("selectedOperator");

  // Calculate area and estimate
  const wallArea = useMemo(() => {
    const w = parseFloat(wallWidth) || 0;
    const h = parseFloat(wallHeight) || 0;
    return w * h;
  }, [wallWidth, wallHeight]);

  const filteredProducts = useMemo(() => {
    if (!productType || !products) return [];
    // For now, return all products since we're using cladding
    return products;
  }, [productType, products]);

  const selectedProductData = useMemo(() => {
    if (!selectedProduct || !filteredProducts) return null;
    return filteredProducts.find((p: any) => p.id.toString() === selectedProduct);
  }, [selectedProduct, filteredProducts]);

  const productDimensions = useMemo(() => {
    if (!selectedProductData) return [];
    // Return standard dimensions for cladding
    return [`${selectedProductData.widthMm}x${selectedProductData.heightMm}mm`];
  }, [selectedProductData]);

  const estimatedCost = useMemo(() => {
    if (!selectedProductData || wallArea === 0) return 0;
    const basePrice = parseFloat(priceOverride) || selectedProductData.pricePerUnit;
    const panelsNeeded = Math.ceil(wallArea / 1); // Simplified calculation
    return basePrice * panelsNeeded;
  }, [selectedProductData, wallArea, priceOverride]);

  const handleSubmit = async () => {
    // Validation
    if (!clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!clientEmail.trim()) {
      toast.error("Client email is required");
      return;
    }
    if (!selectedOperator) {
      toast.error("Please select an operator first");
      return;
    }
    if (!productType) {
      toast.error("Please select a product type");
      return;
    }
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }
    if (wallArea === 0) {
      toast.error("Please enter valid wall dimensions");
      return;
    }

    try {
      // Create job
      const job = await createJobMutation.mutateAsync({
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
      });

      if (!job) throw new Error("Failed to create job");

      // Create job item
      await createJobItemMutation.mutateAsync({
        jobId: job.id,
        itemType: "cladding",
        claddingVariantId: parseInt(selectedProduct),
        wallWidthMm: Math.round(parseFloat(wallWidth) * 1000),
        wallHeightMm: Math.round(parseFloat(wallHeight) * 1000),
        quantityRequired: parseInt(quantity),
        totalPrice: Math.round(estimatedCost * 100),
        manualPriceOverride: priceOverride ? Math.round(parseFloat(priceOverride) * 100) : undefined,
      });

      toast.success("Quote created successfully!");
      // Reset form
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setClientAddress("");
      setProductType("");
      setSelectedProduct("");
      setWallWidth("");
      setWallHeight("");
      setCurrentTab("client");
    } catch (error) {
      toast.error("Failed to create quote. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Stage 1: Quoting</h1>
            <p className="text-xs text-gray-500">Create and estimate job quotes</p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Operator: <span className="font-medium">{operators?.find((o) => o.id.toString() === selectedOperator)?.name}</span>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="client">Client</TabsTrigger>
              <TabsTrigger value="product">Product</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Tab 1: Client Details */}
            <TabsContent value="client" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Client Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter client name"
                      className="mt-1 h-10 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="mt-1 h-10 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Phone</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="mt-1 h-10 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientAddress">Address</Label>
                    <Input
                      id="clientAddress"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="123 Main St, City, State"
                      className="mt-1 h-10 text-base"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 2: Product & Dimensions */}
            <TabsContent value="product" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Wall Dimensions</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label htmlFor="wallWidth">Width (m) *</Label>
                    <Input
                      id="wallWidth"
                      type="number"
                      value={wallWidth}
                      onChange={(e) => setWallWidth(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 h-10 text-base"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="wallHeight">Height (m) *</Label>
                    <Input
                      id="wallHeight"
                      type="number"
                      value={wallHeight}
                      onChange={(e) => setWallHeight(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 h-10 text-base"
                      step="0.01"
                    />
                  </div>
                </div>
                {wallArea > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-blue-900">
                      <strong>Wall Area:</strong> {wallArea.toFixed(2)} m²
                    </p>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Product Selection</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="productType">Product Type *</Label>
                    <Select value={productType} onValueChange={setProductType}>
                      <SelectTrigger id="productType" className="h-10 text-base">
                        <SelectValue placeholder="Select product type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cladding">Cladding</SelectItem>
                        <SelectItem value="acoustic_panel">Acoustic Panels</SelectItem>
                        <SelectItem value="marble_sheet">Marble Sheet</SelectItem>
                        <SelectItem value="mirror">Mirrors</SelectItem>
                        <SelectItem value="fireplace">Fireplace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {productType && (
                    <div>
                      <Label htmlFor="product">Product *</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger id="product" className="h-10 text-base">
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProducts && filteredProducts.map((p: any) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name} - ${p.pricePerUnit.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedProductData && productDimensions.length > 0 && (
                    <div>
                      <Label htmlFor="dimension">Dimension</Label>
                      <Select value={selectedDimension} onValueChange={setSelectedDimension} disabled={useCustomDimension}>
                        <SelectTrigger id="dimension" className="h-10 text-base">
                          <SelectValue placeholder="Select dimension..." />
                        </SelectTrigger>
                        <SelectContent>
                          {productDimensions.map((dim: string, idx: number) => (
                            <SelectItem key={idx} value={dim}>
                              {dim}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="customDim"
                      checked={useCustomDimension}
                      onChange={(e) => setUseCustomDimension(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="customDim" className="cursor-pointer">
                      Use custom dimension
                    </Label>
                  </div>

                  {useCustomDimension && (
                    <div>
                      <Label htmlFor="customDimension">Custom Dimension</Label>
                      <Input
                        id="customDimension"
                        value={customDimension}
                        onChange={(e) => setCustomDimension(e.target.value)}
                        placeholder="e.g., 1200x2400mm"
                        className="mt-1 h-10 text-base"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                        className="mt-1 h-10 text-base"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="priceOverride">Price Override ($)</Label>
                      <Input
                        id="priceOverride"
                        type="number"
                        value={priceOverride}
                        onChange={(e) => setPriceOverride(e.target.value)}
                        placeholder="Leave blank for default"
                        className="mt-1 h-10 text-base"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 3: Summary */}
            <TabsContent value="summary" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Quote Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{clientName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{clientEmail || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wall Area:</span>
                    <span className="font-medium">{wallArea.toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium">{selectedProductData?.name || "—"}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between">
                    <span className="text-gray-900 font-semibold">Estimated Cost:</span>
                    <span className="text-lg font-bold text-blue-600">${estimatedCost.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3 flex-shrink-0">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard")}
          className="flex-1 h-12 text-base"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createJobMutation.isPending}
          className="flex-1 h-12 text-base"
        >
          {createJobMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Create Quote
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
