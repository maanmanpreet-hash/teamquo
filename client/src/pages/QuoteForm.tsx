import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LineItem {
  id: string;
  productType: string;
  productId: string;
  productName: string;
  productDimensionMm: string;
  wallWidthMm: number;
  wallHeightMm: number;
  quantityRequired: number;
  unitPrice: number;
  totalPrice: number;
}

export default function Stage1QuotingWorkspace() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTab, setCurrentTab] = useState("client");

  // Client Details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [tempProductTypeId, setTempProductTypeId] = useState<number | null>(null);
  const [tempProductId, setTempProductId] = useState("");
  const [tempWallWidth, setTempWallWidth] = useState("");
  const [tempWallHeight, setTempWallHeight] = useState("");

  // Queries
  const { data: productTypes } = trpc.products.listTypes.useQuery();
  const { data: productsByType } = trpc.products.listByType.useQuery(
    { productTypeId: tempProductTypeId || 0 },
    { enabled: !!tempProductTypeId }
  );
  const { data: operators } = trpc.operators.list.useQuery();
  const createJobMutation = trpc.jobs.create.useMutation();
  const createJobItemMutation = trpc.jobItems.create.useMutation();

  const selectedOperator = localStorage.getItem("selectedOperator");

  // Get product details
  const getProductDetails = useCallback((productId: string) => {
    if (!productsByType) return null;
    const product = productsByType.find((p: any) => p.id === parseInt(productId));
    return product || null;
  }, [productsByType]);

  // Calculate quantity based on dimensions
  const calculateQuantity = useCallback((wallWidthMm: number, wallHeightMm: number, product: any) => {
    if (!product) return 0;
    
    const wallArea = (wallWidthMm / 1000) * (wallHeightMm / 1000); // Convert to m²
    
    // Get product dimensions (in mm)
    const productWidth = (product.widthMm || 600) / 1000; // Convert to m, default 600mm
    const productHeight = (product.heightMm || 2900) / 1000; // Convert to m, default 2900mm
    const productArea = productWidth * productHeight;
    
    if (productArea === 0) return 1;
    
    // Calculate required quantity with 10% waste factor
    return Math.ceil((wallArea / productArea) * 1.1);
  }, []);

  // Handle product type change
  const handleProductTypeChange = useCallback((typeId: string) => {
    const id = parseInt(typeId);
    setTempProductTypeId(id);
    setTempProductId("");
  }, []);

  // Add line item
  const handleAddLineItem = useCallback(() => {
    if (!tempProductTypeId || !tempProductId || !tempWallWidth || !tempWallHeight) {
      toast.error("Please fill in all product details");
      return;
    }

    const product = getProductDetails(tempProductId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    const productType = productTypes?.find((t: any) => t.id === tempProductTypeId)?.slug || "product";

    const wallWidthMm = Math.round(parseFloat(tempWallWidth) * 1000);
    const wallHeightMm = Math.round(parseFloat(tempWallHeight) * 1000);
    const quantity = calculateQuantity(wallWidthMm, wallHeightMm, product);
    const totalPrice = quantity * product.pricePerUnit;

    const newItem: LineItem = {
      id: Math.random().toString(36),
      productType,
      productId: tempProductId,
      productName: product.name,
      productDimensionMm: `${product.widthMm || 0}x${product.heightMm || 0}`,
      wallWidthMm,
      wallHeightMm,
      quantityRequired: quantity,
      unitPrice: product.pricePerUnit,
      totalPrice,
    };

    setLineItems([...lineItems, newItem]);
    setTempProductTypeId(null);
    setTempProductId("");
    setTempWallWidth("");
    setTempWallHeight("");
    toast.success(`Added ${quantity} units of ${product.name}`);
  }, [tempProductTypeId, tempProductId, tempWallWidth, tempWallHeight, getProductDetails, calculateQuantity, productTypes]);

  // Remove line item
  const handleRemoveLineItem = useCallback((id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  }, [lineItems]);

  // Calculate total
  const totalCost = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [lineItems]);

  // Validate form
  const isFormValid = clientName && clientEmail && clientPhone && clientAddress && lineItems.length > 0;

  // Handle submit
  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("Please complete all required fields and add at least one product");
      return;
    }

    if (!selectedOperator) {
      toast.error("Please select an operator");
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

      // Create job items
      for (const item of lineItems) {
        const product = getProductDetails(item.productId);
        if (!product) continue;

        await createJobItemMutation.mutateAsync({
          jobId: job.id,
          itemType: (item.productType === "cladding" ? "cladding" : "cabinet") as "cladding" | "cabinet",
          claddingVariantId: item.productType === "cladding" ? parseInt(item.productId) : undefined,
          wallWidthMm: item.wallWidthMm,
          wallHeightMm: item.wallHeightMm,
          quantityRequired: item.quantityRequired,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }

      toast.success("Quote created successfully!");
      navigate("/jobs");
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
            <p className="text-xs text-gray-500">Operator: {selectedOperator || "Not selected"}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="client">Client</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Client Tab */}
            <TabsContent value="client" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Client Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientName" className="text-sm font-medium">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter client name"
                      className="mt-1 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                    {clientName && <p className="text-xs text-green-600 mt-1">✓ Entered</p>}
                  </div>
                  <div>
                    <Label htmlFor="clientEmail" className="text-sm font-medium">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="mt-1 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                    {clientEmail && <p className="text-xs text-green-600 mt-1">✓ Entered</p>}
                  </div>
                  <div>
                    <Label htmlFor="clientPhone" className="text-sm font-medium">Phone *</Label>
                    <Input
                      id="clientPhone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="0412 345 678"
                      className="mt-1 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                    {clientPhone && <p className="text-xs text-green-600 mt-1">✓ Entered</p>}
                  </div>
                  <div>
                    <Label htmlFor="clientAddress" className="text-sm font-medium">Address *</Label>
                    <Input
                      id="clientAddress"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="123 Main St, City, State 1234"
                      className="mt-1 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                    {clientAddress && <p className="text-xs text-green-600 mt-1">✓ Entered</p>}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Add Products</h2>
                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="productType" className="text-sm font-medium">Product Type *</Label>
                    <Select value={tempProductTypeId?.toString() || ""} onValueChange={handleProductTypeChange}>
                      <SelectTrigger className="mt-1 h-12 text-base">
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes?.map((type: any) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {tempProductTypeId && productsByType && (
                    <div>
                      <Label htmlFor="product" className="text-sm font-medium">Product *</Label>
                      <Select value={tempProductId} onValueChange={setTempProductId}>
                        <SelectTrigger className="mt-1 h-12 text-base">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {productsByType.map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - ${(product.pricePerUnit / 100).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wallWidth" className="text-sm font-medium">Wall Width (m) *</Label>
                      <Input
                        id="wallWidth"
                        type="number"
                        value={tempWallWidth}
                        onChange={(e) => setTempWallWidth(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wallHeight" className="text-sm font-medium">Wall Height (m) *</Label>
                      <Input
                        id="wallHeight"
                        type="number"
                        value={tempWallHeight}
                        onChange={(e) => setTempWallHeight(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleAddLineItem}
                    className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>

                {/* Line Items */}
                {lineItems.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Added Products ({lineItems.length})</h3>
                    {lineItems.map((item) => (
                      <div key={item.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-gray-600">
                            {item.wallWidthMm / 1000}m × {item.wallHeightMm / 1000}m | {item.quantityRequired} units @ ${(item.unitPrice / 100).toFixed(2)}
                          </p>
                          <p className="text-sm font-semibold text-blue-600 mt-1">
                            ${(item.totalPrice / 100).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Quote Summary</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-semibold">{clientName || "Not entered"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="text-sm">{clientEmail}</p>
                    <p className="text-sm">{clientPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="text-sm">{clientAddress}</p>
                  </div>
                  <hr className="my-4" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Products ({lineItems.length})</p>
                    {lineItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm mb-2">
                        <span>{item.productName} ({item.quantityRequired} units)</span>
                        <span className="font-semibold">${(item.totalPrice / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <hr className="my-4" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Quote</span>
                    <span className="text-blue-600">${(totalCost / 100).toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3 flex-shrink-0">
        <Button
          onClick={() => navigate("/dashboard")}
          variant="outline"
          className="flex-1 h-12 text-base"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createJobMutation.isPending || !isFormValid}
          className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700"
        >
          {createJobMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Quote"
          )}
        </Button>
      </div>
    </div>
  );
}
