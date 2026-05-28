"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface WallWithProducts {
  id: string;
  wallType: string;
  wallName: string;
  wallWidthMm: number;
  wallHeightMm: number;
  products: WallProduct[];
}

interface WallProduct {
  id: string;
  productType: string; // "cladding" | "acoustic_panel" | "floating_cabinet"
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  // For cladding/acoustic panels
  panelWidthMm?: number;
  panelHeightMm?: number;
  // For acoustic panels
  acousticLengthM?: number;
  acousticWidthM?: number;
  // For floating cabinet
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetDepthMm?: number;
  cabinetHeightFromFloorMm?: number;
}

export default function Stage1QuotingWorkspace() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTab, setCurrentTab] = useState("client");
  const [resumeJobId, setResumeJobId] = useState<number | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Client Details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Walls with integrated products
  const [wallsWithProducts, setWallsWithProducts] = useState<WallWithProducts[]>([]);
  const [editingWallId, setEditingWallId] = useState<string | null>(null);
  const [tempWallType, setTempWallType] = useState("regular");
  const [tempWallName, setTempWallName] = useState("");
  const [tempWallWidth, setTempWallWidth] = useState("");
  const [tempWallHeight, setTempWallHeight] = useState("");

  // Product selection for current wall
  const [tempProductType, setTempProductType] = useState<"cladding" | "acoustic_panel" | "floating_cabinet" | "fireplace" | "mirror" | null>(null);
  const [tempProductId, setTempProductId] = useState("");
  const [tempQuantity, setTempQuantity] = useState("");
  
  // Acoustic panel specific
  const [tempAcousticLength, setTempAcousticLength] = useState("");
  const [tempAcousticWidth, setTempAcousticWidth] = useState("");
  
  // Floating cabinet specific
  const [tempCabinetWidth, setTempCabinetWidth] = useState("");
  const [tempCabinetHeight, setTempCabinetHeight] = useState("");
  const [tempCabinetDepth, setTempCabinetDepth] = useState("");
  const [tempCabinetHeightFromFloor, setTempCabinetHeightFromFloor] = useState("");

  // Queries
  const { data: productTypes } = trpc.products.listTypes.useQuery();
  const { data: productsByType } = trpc.products.listByType.useQuery(
    { productTypeId: tempProductType === "cladding" ? 1 : tempProductType === "acoustic_panel" ? 2 : tempProductType === "floating_cabinet" ? 3 : tempProductType === "fireplace" ? 4 : tempProductType === "mirror" ? 5 : 0 },
    { enabled: !!tempProductType }
  );
  const { data: operators } = trpc.operators.list.useQuery();
  const { data: draftJob } = trpc.jobs.getById.useQuery(
    { id: resumeJobId || 0 },
    { enabled: resumeJobId !== null }
  );
  const { data: savedWalls } = trpc.walls.getByJobId.useQuery(
    { jobId: resumeJobId || 0 },
    { enabled: resumeJobId !== null }
  );

  const createJobMutation = trpc.jobs.create.useMutation();
  const updateJobMutation = trpc.jobs.update.useMutation();
  const createJobItemMutation = trpc.jobItems.create.useMutation();
  const uploadImageMutation = trpc.storage.uploadImage.useMutation();
  const createWallMutation = trpc.walls.create.useMutation();
  const deleteWallMutation = trpc.walls.delete.useMutation();

  const selectedOperator = localStorage.getItem("selectedOperator");

  // Load draft on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("resumeJobId");
    if (jobId) {
      setResumeJobId(parseInt(jobId));
      setIsLoadingDraft(true);
    }
  }, []);

  // Load draft data
  useEffect(() => {
    if (draftJob && isLoadingDraft) {
      setClientName(draftJob.clientName === "[Draft]" ? "" : draftJob.clientName);
      setClientEmail(draftJob.clientEmail || "");
      setClientPhone(draftJob.clientPhone || "");
      setClientAddress(draftJob.clientAddress || "");
      setSuburb(draftJob.suburb || "");
      if (draftJob.appointmentDate) {
        const date = new Date(draftJob.appointmentDate);
        setAppointmentDate(date.toISOString().split('T')[0]);
      }
      setAppointmentTime(draftJob.appointmentTime || "");
      if (draftJob.referenceImageUrl) {
        setReferenceImageUrl(draftJob.referenceImageUrl);
        setReferenceImagePreview(draftJob.referenceImageUrl);
      }
      setIsLoadingDraft(false);
    }
  }, [draftJob, isLoadingDraft]);

  // Load walls and their products
  useEffect(() => {
    if (savedWalls && savedWalls.length > 0) {
      const wallsData = savedWalls.map((wall: any) => ({
        id: wall.id.toString(),
        wallType: wall.wallType,
        wallName: wall.wallName,
        wallWidthMm: wall.wallWidthMm,
        wallHeightMm: wall.wallHeightMm,
        products: wall.products || [],
      }));
      setWallsWithProducts(wallsData);
    }
  }, [savedWalls]);

  // Calculate panel quantity for cladding/acoustic
  const calculatePanelQuantity = (wallWidthMm: number, wallHeightMm: number, panelWidthMm: number, panelHeightMm: number) => {
    const panelsHorizontal = Math.ceil(wallWidthMm / panelWidthMm);
    const panelsVertical = Math.ceil(wallHeightMm / panelHeightMm);
    return panelsHorizontal * panelsVertical;
  };

  // Add new wall
  const handleAddWall = () => {
    if (!tempWallType || !tempWallName || !tempWallWidth || !tempWallHeight) {
      toast.error("Please fill all wall details");
      return;
    }

    const newWall: WallWithProducts = {
      id: Date.now().toString(),
      wallType: tempWallType,
      wallName: tempWallName,
      wallWidthMm: Math.round(parseFloat(tempWallWidth) * 1000),
      wallHeightMm: Math.round(parseFloat(tempWallHeight) * 1000),
      products: [],
    };

    setWallsWithProducts([...wallsWithProducts, newWall]);
    setTempWallType("regular");
    setTempWallName("");
    setTempWallWidth("");
    setTempWallHeight("");
    toast.success("Wall added");
  };

  // Add product to wall
  const handleAddProductToWall = (wallId: string) => {
    if (!tempProductType || !tempProductId) {
      toast.error("Please select a product");
      return;
    }

    const wall = wallsWithProducts.find(w => w.id === wallId);
    if (!wall) return;

    let quantity = 1;
    let newProduct: WallProduct = {
      id: Date.now().toString(),
      productType: tempProductType,
      productId: tempProductId,
      productName: "Product",
      quantity: 1,
      unitPrice: 0,
    };

    if (tempProductType === "cladding") {
      const foundProduct = productsByType?.find(p => p.id.toString() === tempProductId);
      if (!foundProduct) {
        toast.error("Product not found");
        return;
      }
      quantity = calculatePanelQuantity(wall.wallWidthMm, wall.wallHeightMm, foundProduct.widthMm || 0, foundProduct.heightMm || 0);
      newProduct = {
        ...newProduct,
        productName: foundProduct.name,
        panelWidthMm: foundProduct.widthMm || 0,
        panelHeightMm: foundProduct.heightMm || 0,
        quantity,
        unitPrice: foundProduct.pricePerUnit,
      };
    } else if (tempProductType === "acoustic_panel") {
      const foundProduct = productsByType?.find(p => p.id.toString() === tempProductId);
      if (!foundProduct) {
        toast.error("Product not found");
        return;
      }
      // Auto-calculate quantity based on wall dimensions and panel size
      quantity = calculatePanelQuantity(wall.wallWidthMm, wall.wallHeightMm, foundProduct.widthMm || 1000, foundProduct.heightMm || 1000);
      newProduct = {
        ...newProduct,
        productName: foundProduct.name,
        panelWidthMm: foundProduct.widthMm || 1000,
        panelHeightMm: foundProduct.heightMm || 1000,
        quantity,
        unitPrice: foundProduct.pricePerUnit,
      };
    } else if (tempProductType === "fireplace" || tempProductType === "mirror") {
      const foundProduct = productsByType?.find(p => p.id.toString() === tempProductId);
      if (!foundProduct) {
        toast.error("Product not found");
        return;
      }
      newProduct = {
        ...newProduct,
        productName: foundProduct.name,
        quantity: 1,
        unitPrice: foundProduct.pricePerUnit,
      };
    } else if (tempProductType === "floating_cabinet") {
      if (!tempCabinetWidth || !tempCabinetHeight || !tempCabinetDepth || !tempCabinetHeightFromFloor) {
        toast.error("Please enter all cabinet dimensions");
        return;
      }
      const foundProduct = productsByType?.find(p => p.id.toString() === tempProductId);
      if (!foundProduct) {
        toast.error("Product not found");
        return;
      }
      newProduct = {
        ...newProduct,
        productName: foundProduct.name,
        cabinetWidthMm: Math.round(parseFloat(tempCabinetWidth)),
        cabinetHeightMm: Math.round(parseFloat(tempCabinetHeight)),
        cabinetDepthMm: Math.round(parseFloat(tempCabinetDepth)),
        cabinetHeightFromFloorMm: Math.round(parseFloat(tempCabinetHeightFromFloor)),
        quantity: 1,
        unitPrice: foundProduct.pricePerUnit,
      };
    }

    const updatedWalls = wallsWithProducts.map(w => 
      w.id === wallId ? { ...w, products: [...w.products, newProduct] } : w
    );
    setWallsWithProducts(updatedWalls);
    
    // Reset product form
    setTempProductType(null);
    setTempProductId("");
    setTempQuantity("");

    setTempCabinetWidth("");
    setTempCabinetHeight("");
    setTempCabinetDepth("");
    setTempCabinetHeightFromFloor("");
    
    toast.success("Product added to wall");
  };

  // Remove product from wall
  const handleRemoveProduct = (wallId: string, productId: string) => {
    const updatedWalls = wallsWithProducts.map(w =>
      w.id === wallId ? { ...w, products: w.products.filter(p => p.id !== productId) } : w
    );
    setWallsWithProducts(updatedWalls);
    toast.success("Product removed");
  };

  // Delete wall
  const handleDeleteWall = (wallId: string) => {
    setWallsWithProducts(wallsWithProducts.filter(w => w.id !== wallId));
    // Delete from backend if it has a numeric ID
    if (!isNaN(parseInt(wallId))) {
      deleteWallMutation.mutate({ id: parseInt(wallId) });
    }
    toast.success("Wall deleted");
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF are supported");
      return;
    }

    setIsUploadingImage(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const result = await uploadImageMutation.mutateAsync({
        base64Data: base64,
        fileName: file.name,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      });
      setReferenceImageUrl(result.url);
      setReferenceImagePreview(result.url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!clientName) {
      toast.error("Please enter client name");
      return;
    }

    try {
      let jobId = resumeJobId;

      if (!jobId) {
        const job = await createJobMutation.mutateAsync({
          clientName,
          clientEmail,
          clientPhone,
          clientAddress,
          suburb,
          appointmentDate: appointmentDate || undefined,
          appointmentTime,
          referenceImageUrl,
        });
        if (job && 'id' in job) {
          jobId = (job as any).id;
          setResumeJobId((job as any).id);
        }
      } else {
        await updateJobMutation.mutateAsync({
          id: jobId,
          clientName,
          clientEmail,
          clientPhone,
          clientAddress,
          suburb,
          appointmentDate: appointmentDate || undefined,
          appointmentTime,
          referenceImageUrl,
        });
      }

      // Save walls
      if (!jobId) return;
      for (const wall of wallsWithProducts) {
        if (isNaN(parseInt(wall.id))) {
          const createdWall = await createWallMutation.mutateAsync({
            jobId: jobId,
            wallType: wall.wallType as "regular" | "garage" | "custom",
            wallName: wall.wallName,
            wallWidthMm: wall.wallWidthMm,
            wallHeightMm: wall.wallHeightMm,
          });

          // Save products for this wall
          const wallId = (createdWall as any)?.id || parseInt(wall.id);
          for (const product of wall.products) {
            await createJobItemMutation.mutateAsync({
              jobId: jobId,
              wallId,
              itemType: product.productType as "cladding" | "acoustic_panel" | "floating_cabinet",
              claddingVariantId: product.productType === "cladding" ? parseInt(product.productId) : undefined,
              wallWidthMm: wall.wallWidthMm,
              wallHeightMm: wall.wallHeightMm,
              cabinetWidthMm: product.cabinetWidthMm,
              cabinetHeightMm: product.cabinetHeightMm,
              cabinetDepthMm: product.cabinetDepthMm,
              cabinetHeightFromFloorMm: product.cabinetHeightFromFloorMm,
              quantityRequired: product.quantity,
              unitPrice: product.unitPrice,
              totalPrice: product.quantity * product.unitPrice,
            });
          }
        }
      }

      toast.success("Quote saved as draft");
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    }
  };

  // Calculate total cost
  const calculateTotal = () => {
    return wallsWithProducts.reduce((total, wall) => {
      return total + wall.products.reduce((wallTotal, product) => {
        return wallTotal + (product.quantity * product.unitPrice);
      }, 0);
    }, 0);
  };

  const canSaveDraft = clientName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/jobs")}
              variant="ghost"
              size="icon"
              className="h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Create Quote</h1>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="client">Client Details</TabsTrigger>
            <TabsTrigger value="walls">Walls & Products</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Client Details Tab */}
          <TabsContent value="client" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName" className="text-sm font-medium">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail" className="text-sm font-medium">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone" className="text-sm font-medium">Phone</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="0412 345 678"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress" className="text-sm font-medium">Address</Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="123 Main St"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="suburb" className="text-sm font-medium">Suburb</Label>
                  <Select value={suburb} onValueChange={setSuburb}>
                    <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                      <SelectValue placeholder="Select suburb" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kalkallo">Kalkallo</SelectItem>
                      <SelectItem value="Donnybrook">Donnybrook</SelectItem>
                      <SelectItem value="Mickleham">Mickleham</SelectItem>
                      <SelectItem value="Craigieburn">Craigieburn</SelectItem>
                      <SelectItem value="Beveridge">Beveridge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="appointmentDate" className="text-sm font-medium">Appointment Date</Label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="appointmentTime" className="text-sm font-medium">Appointment Time</Label>
                  <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                    <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 48 }).map((_, i) => {
                        const hour = Math.floor(i / 2);
                        const minute = (i % 2) * 30;
                        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        return <SelectItem key={time} value={time}>{time}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reference Image Upload */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Reference Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="mt-1 h-12 text-base border-2 border-gray-200"
                />
                {referenceImagePreview && (
                  <div className="mt-2 relative">
                    <img 
                      src={referenceImagePreview} 
                      alt="Reference" 
                      className="max-h-48 rounded border-2 border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setReferenceImageUrl("");
                        setReferenceImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Save Draft Button */}
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                className="w-full h-12 text-base"
                disabled={createJobMutation.isPending || !canSaveDraft}
              >
                {createJobMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Draft
              </Button>
            </Card>
          </TabsContent>

          {/* Walls & Products Tab */}
          <TabsContent value="walls" className="space-y-4">
            {/* Add Wall Form */}
            <Card className="p-6 space-y-4 border-2 border-dashed">
              <h2 className="text-lg font-semibold">Add New Wall</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wallType" className="text-sm font-medium">Wall Type *</Label>
                  <Select value={tempWallType} onValueChange={setTempWallType}>
                    <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Hallway Wall</SelectItem>
                      <SelectItem value="garage">Garage Wall</SelectItem>
                      <SelectItem value="custom">TV Wall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wallName" className="text-sm font-medium">Wall Name *</Label>
                  <Input
                    id="wallName"
                    value={tempWallName}
                    onChange={(e) => setTempWallName(e.target.value)}
                    placeholder="e.g., Living Room"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="wallWidth" className="text-sm font-medium flex items-center gap-2">
                    <span>Width (m) *</span>
                    <span className="text-lg">↔️</span>
                  </Label>
                  <Input
                    id="wallWidth"
                    type="number"
                    step="0.1"
                    value={tempWallWidth}
                    onChange={(e) => setTempWallWidth(e.target.value)}
                    placeholder="e.g., 3.5"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="wallHeight" className="text-sm font-medium flex items-center gap-2">
                    <span>Height (m) *</span>
                    <span className="text-lg">📏</span>
                  </Label>
                  <Input
                    id="wallHeight"
                    type="number"
                    step="0.1"
                    value={tempWallHeight}
                    onChange={(e) => setTempWallHeight(e.target.value)}
                    placeholder="e.g., 2.4"
                    className="mt-1 h-12 text-base border-2 border-gray-200"
                  />
                </div>
              </div>
              <Button onClick={handleAddWall} className="w-full h-12 text-base">
                <Plus className="w-4 h-4 mr-2" />
                Add Wall
              </Button>
            </Card>

            {/* Walls List with Products */}
            <div className="space-y-4">
              {wallsWithProducts.map((wall) => (
                <Card key={wall.id} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{wall.wallName}</h3>
                      <p className="text-sm text-gray-600">
                        {wall.wallType} • {(wall.wallWidthMm / 1000).toFixed(1)}m × {(wall.wallHeightMm / 1000).toFixed(1)}m
                      </p>
                    </div>
                    <Button
                      onClick={() => handleDeleteWall(wall.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Add Product to Wall */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Add Product to this Wall</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Product Type *</Label>
                        <Select value={tempProductType || ""} onValueChange={(val) => {
                          setTempProductType(val as any);
                          setTempProductId("");
                        }}>
                          <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cladding">Cladding</SelectItem>
                            <SelectItem value="acoustic_panel">Acoustic Panel</SelectItem>
                            <SelectItem value="floating_cabinet">Floating Cabinet</SelectItem>
                            <SelectItem value="fireplace">Fireplace</SelectItem>
                            <SelectItem value="mirror">Mirror</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {tempProductType && (
                        <div>
                          <Label className="text-sm font-medium">Product *</Label>
                          <Select value={tempProductId} onValueChange={setTempProductId}>
                            <SelectTrigger className="mt-1 h-12 text-base border-2 border-gray-200">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsByType?.map((product: any) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name} - ${(product.pricePerUnit / 100).toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Acoustic Panel Dimensions */}
                    {/* Acoustic panels auto-calculate - no manual entry needed */}

                    {/* Floating Cabinet Dimensions */}
                    {tempProductType === "floating_cabinet" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Width (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetWidth}
                            onChange={(e) => setTempCabinetWidth(e.target.value)}
                            placeholder="e.g., 600"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Height (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetHeight}
                            onChange={(e) => setTempCabinetHeight(e.target.value)}
                            placeholder="e.g., 400"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Depth (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetDepth}
                            onChange={(e) => setTempCabinetDepth(e.target.value)}
                            placeholder="e.g., 300"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Height from Floor (mm) *</Label>
                          <Input
                            type="number"
                            value={tempCabinetHeightFromFloor}
                            onChange={(e) => setTempCabinetHeightFromFloor(e.target.value)}
                            placeholder="e.g., 800"
                            className="mt-1 h-12 text-base border-2 border-gray-200"
                          />
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={() => handleAddProductToWall(wall.id)}
                      className="w-full h-12 text-base"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>

                  {/* Products List */}
                  {wall.products.length > 0 && (
                    <div className="border-t pt-4 space-y-2">
                      <h4 className="font-medium">Products ({wall.products.length})</h4>
                      {wall.products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-gray-600">
                              Qty: {product.quantity} × ${(product.unitPrice / 100).toFixed(2)} = ${(product.quantity * product.unitPrice / 100).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleRemoveProduct(wall.id, product.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Quote Summary</h2>
              
              {/* Client Info */}
              <div className="border-b pb-4">
                <h3 className="font-medium mb-2">Client Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Name: <span className="font-medium">{clientName}</span></div>
                  <div>Phone: <span className="font-medium">{clientPhone}</span></div>
                  <div>Email: <span className="font-medium">{clientEmail}</span></div>
                  <div>Address: <span className="font-medium">{clientAddress}</span></div>
                  <div>Suburb: <span className="font-medium">{suburb}</span></div>
                  <div>Appointment: <span className="font-medium">{appointmentDate} {appointmentTime}</span></div>
                </div>
              </div>

              {/* Walls Summary */}
              {wallsWithProducts.map((wall) => (
                <div key={wall.id} className="border-b pb-4">
                  <h3 className="font-medium mb-2">{wall.wallName} ({(wall.wallWidthMm / 1000).toFixed(1)}m × {(wall.wallHeightMm / 1000).toFixed(1)}m)</h3>
                  {wall.products.map((product) => (
                    <div key={product.id} className="text-sm ml-4 mb-2">
                      <p>{product.productName}</p>
                      <p className="text-gray-600">Qty: {product.quantity} × ${(product.unitPrice / 100).toFixed(2)} = <span className="font-medium">${(product.quantity * product.unitPrice / 100).toFixed(2)}</span></p>
                    </div>
                  ))}
                </div>
              ))}

              {/* Total */}
              <div className="text-right">
                <p className="text-2xl font-bold">
                  Total: ${(calculateTotal() / 100).toFixed(2)}
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
