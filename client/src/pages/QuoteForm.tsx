import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface QuoteItem {
  id: string;
  productTypeId: number;
  productId: number;
  quantity: number;
  wallWidthMm?: number;
  wallHeightMm?: number;
  manualPriceOverride?: number;
}

export default function QuoteForm() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Quote items
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  // Fetch product types and products
  const { data: productTypes, isLoading: loadingTypes } = trpc.products.listTypes.useQuery();
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<number | null>(null);
  const { data: products, isLoading: loadingProducts } = trpc.products.listByType.useQuery(
    { productTypeId: selectedProductTypeId! },
    { enabled: !!selectedProductTypeId }
  );

  // Mutations
  const createJobMutation = trpc.jobs.create.useMutation();
  const createJobItemMutation = trpc.jobItems.create.useMutation();

  // Calculate price for a single item with discount
  const calculateItemPrice = (item: QuoteItem, product: any) => {
    let basePrice = product.pricePerUnit;
    let quantity = item.quantity;

    // For cladding-like products with dimensions, calculate quantity from area
    if (item.wallWidthMm && item.wallHeightMm && product.widthMm && product.heightMm) {
      const wallAreaMm2 = item.wallWidthMm * item.wallHeightMm;
      const panelAreaMm2 = product.widthMm * product.heightMm;
      quantity = Math.ceil(wallAreaMm2 / panelAreaMm2);
    }

    return { quantity, basePrice, totalPrice: quantity * basePrice };
  };

  // Calculate total estimate
  const calculateEstimate = useMemo(() => {
    let total = 0;
    let itemCount = 0;

    quoteItems.forEach((item) => {
      const product = products?.find((p) => p.id === item.productId);
      if (product) {
        if (item.manualPriceOverride) {
          total += item.manualPriceOverride;
        } else {
          const { totalPrice } = calculateItemPrice(item, product);
          total += totalPrice;
        }
        itemCount++;
      }
    });

    return { total, itemCount, isValid: itemCount > 0 };
  }, [quoteItems, products]);

  const handleAddItem = () => {
    if (!selectedProductTypeId) {
      toast.error("Please select a product type first");
      return;
    }
    const newItem: QuoteItem = {
      id: Math.random().toString(),
      productTypeId: selectedProductTypeId,
      productId: 0,
      quantity: 1,
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setQuoteItems(quoteItems.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<QuoteItem>) => {
    setQuoteItems(
      quoteItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to create a quote");
      return;
    }

    if (!clientName || !clientEmail || !clientPhone) {
      toast.error("Please fill in all client details");
      return;
    }

    if (!calculateEstimate.isValid) {
      toast.error("Please add at least one item to the quote");
      return;
    }

    try {
      // Create job
      const jobResult = await createJobMutation.mutateAsync({
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        notes,
      });

      // Create job items
      if (jobResult) {
        for (const item of quoteItems) {
          const product = products?.find((p) => p.id === item.productId);
          if (product) {
            const { quantity, totalPrice } = calculateItemPrice(item, product);
            await createJobItemMutation.mutateAsync({
              jobId: jobResult.id,
              itemType: "cladding",
              claddingVariantId: item.productId,
              wallWidthMm: item.wallWidthMm,
              wallHeightMm: item.wallHeightMm,
              quantityRequired: quantity,
              totalPrice,
              manualPriceOverride: item.manualPriceOverride,
            });
          }
        }
      }

      toast.success("Quote created successfully!");
      setLocation("/jobs");
    } catch (error) {
      toast.error(`Error creating quote: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Quote</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
              <CardDescription>Enter client information for the quote</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    placeholder="e.g., John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    required
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Phone *</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    required
                    placeholder="0412 345 678"
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress">Address</Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="123 Main St, Sydney NSW"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes or special requirements"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Quote Items</CardTitle>
                <CardDescription>Add products to the quote</CardDescription>
              </div>
              <Button type="button" onClick={handleAddItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingTypes ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  Loading product types...
                </div>
              ) : (
                <div>
                  <Label htmlFor="productType">Product Type</Label>
                  <Select
                    value={selectedProductTypeId?.toString() || ""}
                    onValueChange={(value) => setSelectedProductTypeId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product type" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {quoteItems.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No items added yet. Click "Add Item" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quoteItems.map((item, index) => {
                    const product = products?.find((p) => p.id === item.productId);
                    const { quantity, totalPrice } = product
                      ? calculateItemPrice(item, product)
                      : { quantity: 0, totalPrice: 0 };

                    return (
                      <Card key={item.id} className="bg-muted/50">
                        <CardContent className="pt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Item {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`product-${item.id}`}>Product *</Label>
                              <Select
                                value={item.productId.toString()}
                                onValueChange={(value) =>
                                  handleUpdateItem(item.id, { productId: parseInt(value) })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {loadingProducts ? (
                                    <div className="p-2">Loading...</div>
                                  ) : (
                                    products?.map((prod) => (
                                      <SelectItem key={prod.id} value={prod.id.toString()}>
                                        {prod.name} - ${(prod.pricePerUnit / 100).toFixed(2)}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {product?.widthMm && product?.heightMm && (
                              <>
                                <div>
                                  <Label htmlFor={`width-${item.id}`}>Wall Width (mm)</Label>
                                  <Input
                                    id={`width-${item.id}`}
                                    type="number"
                                    value={item.wallWidthMm || ""}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, { wallWidthMm: parseInt(e.target.value) || 0 })
                                    }
                                    placeholder="e.g., 3000"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`height-${item.id}`}>Wall Height (mm)</Label>
                                  <Input
                                    id={`height-${item.id}`}
                                    type="number"
                                    value={item.wallHeightMm || ""}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, { wallHeightMm: parseInt(e.target.value) || 0 })
                                    }
                                    placeholder="e.g., 2400"
                                  />
                                </div>
                              </>
                            )}

                            <div>
                              <Label htmlFor={`override-${item.id}`}>Manual Price Override ($)</Label>
                              <Input
                                id={`override-${item.id}`}
                                type="number"
                                step="0.01"
                                value={item.manualPriceOverride ? (item.manualPriceOverride / 100).toFixed(2) : ""}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    manualPriceOverride: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined,
                                  })
                                }
                                placeholder="Leave empty for auto-calculation"
                              />
                            </div>
                          </div>

                          {product && (
                            <div className="bg-background p-3 rounded border">
                              <div className="text-sm space-y-1">
                                <p>
                                  <span className="font-semibold">Quantity:</span> {quantity} units
                                </p>
                                <p>
                                  <span className="font-semibold">Price:</span> ${(totalPrice / 100).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estimate Summary */}
          {calculateEstimate.isValid && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle>Estimate Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total Estimate:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${(calculateEstimate.total / 100).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createJobMutation.isPending || !calculateEstimate.isValid}
              className="flex-1"
            >
              {createJobMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Quote...
                </>
              ) : (
                "Create Quote"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
