import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

interface QuoteItem {
  itemType: "cladding" | "cabinet";
  claddingVariantId?: number;
  wallWidthMm?: number;
  wallHeightMm?: number;
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetDepthMm?: number;
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
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    { itemType: "cladding" },
  ]);

  // Fetch cladding variants
  const { data: claddingVariants, isLoading: loadingVariants } = trpc.cladding.list.useQuery();

  // Mutations - declared at component scope
  const createJobMutation = trpc.jobs.create.useMutation();
  const createJobItemMutation = trpc.jobItems.create.useMutation();
  const updateJobMutation = trpc.jobs.update.useMutation();

  // Calculate total estimate and validate
  const calculateEstimate = () => {
    let total = 0;
    let isValid = true;

    quoteItems.forEach((item) => {
      if (item.itemType === "cladding") {
        if (!item.claddingVariantId || !item.wallWidthMm || !item.wallHeightMm) {
          isValid = false;
          return;
        }
        const variant = claddingVariants?.find((v) => v.id === item.claddingVariantId);
        if (variant) {
          const wallAreaMm2 = item.wallWidthMm * item.wallHeightMm;
          const panelAreaMm2 = variant.widthMm * variant.heightMm;
          const panelsNeeded = Math.ceil(wallAreaMm2 / panelAreaMm2);
          const itemPrice = item.manualPriceOverride || panelsNeeded * variant.pricePerUnit;
          total += itemPrice;
        }
      } else if (item.itemType === "cabinet") {
        if (!item.cabinetWidthMm || !item.cabinetHeightMm || !item.cabinetDepthMm) {
          isValid = false;
          return;
        }
        if (!item.manualPriceOverride) {
          isValid = false;
          return;
        }
        total += item.manualPriceOverride;
      }
    });

    return { total, isValid };
  };

  const { total: totalEstimate, isValid: isEstimateValid } = calculateEstimate();

  const handleAddItem = () => {
    setQuoteItems([...quoteItems, { itemType: "cladding" }]);
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, updates: Partial<QuoteItem>) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], ...updates };
    setQuoteItems(newItems);
  };

  const getWallArea = (item: QuoteItem) => {
    if (item.itemType === "cladding" && item.wallWidthMm && item.wallHeightMm) {
      return (item.wallWidthMm * item.wallHeightMm / 1000000).toFixed(2); // Convert mm² to m²
    }
    return null;
  };

  const getPanelsNeeded = (item: QuoteItem) => {
    if (item.itemType === "cladding" && item.claddingVariantId && item.wallWidthMm && item.wallHeightMm) {
      const variant = claddingVariants?.find((v) => v.id === item.claddingVariantId);
      if (variant) {
        const wallAreaMm2 = item.wallWidthMm * item.wallHeightMm;
        const panelAreaMm2 = variant.widthMm * variant.heightMm;
        return Math.ceil(wallAreaMm2 / panelAreaMm2);
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error("Client name is required");
      return;
    }

    if (quoteItems.length === 0) {
      toast.error("Add at least one item to the quote");
      return;
    }

    // Validate all items before creating job
    for (const item of quoteItems) {
      if (item.itemType === "cladding") {
        if (!item.claddingVariantId || !item.wallWidthMm || !item.wallHeightMm) {
          toast.error("Please fill in all cladding details for each item");
          return;
        }
      } else if (item.itemType === "cabinet") {
        if (!item.cabinetWidthMm || !item.cabinetHeightMm || !item.cabinetDepthMm) {
          toast.error("Please fill in all cabinet dimensions");
          return;
        }
        if (!item.manualPriceOverride) {
          toast.error("Please enter a price for cabinet items");
          return;
        }
      }
    }

    try {
      // Create job
      const job = await createJobMutation.mutateAsync({
        clientName,
        clientEmail: clientEmail || undefined,
        clientPhone: clientPhone || undefined,
        clientAddress: clientAddress || undefined,
        notes: notes || undefined,
      });

      if (!job?.id) throw new Error("Failed to create job");

      // Create job items
      for (const item of quoteItems) {
        if (item.itemType === "cladding") {
          const variant = claddingVariants?.find((v) => v.id === item.claddingVariantId);
          if (!variant) throw new Error("Invalid cladding variant");

          const wallAreaMm2 = item.wallWidthMm! * item.wallHeightMm!;
          const panelAreaMm2 = variant.widthMm * variant.heightMm;
          const panelsNeeded = Math.ceil(wallAreaMm2 / panelAreaMm2);
          const itemPrice = item.manualPriceOverride || panelsNeeded * variant.pricePerUnit;

          await createJobItemMutation.mutateAsync({
            jobId: job.id,
            itemType: "cladding",
            claddingVariantId: item.claddingVariantId,
            wallWidthMm: item.wallWidthMm,
            wallHeightMm: item.wallHeightMm,
            quantityRequired: panelsNeeded,
            unitPrice: variant.pricePerUnit,
            totalPrice: itemPrice,
            manualPriceOverride: item.manualPriceOverride,
          });
        } else if (item.itemType === "cabinet") {
          await createJobItemMutation.mutateAsync({
            jobId: job.id,
            itemType: "cabinet",
            cabinetWidthMm: item.cabinetWidthMm,
            cabinetHeightMm: item.cabinetHeightMm,
            cabinetDepthMm: item.cabinetDepthMm,
            manualPriceOverride: item.manualPriceOverride,
          });
        }
      }

      // Update job with total estimate
      await updateJobMutation.mutateAsync({
        id: job.id,
        totalEstimate,
      });

      toast.success("Quote created successfully");

      // Reset form
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setClientAddress("");
      setNotes("");
      setQuoteItems([{ itemType: "cladding" }]);

      // Redirect to jobs dashboard
      setLocation("/jobs");
    } catch (error: any) {
      toast.error(error.message || "Failed to create quote");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to create quotes</h1>
        </div>
      </div>
    );
  }

  const isSubmitting = createJobMutation.isPending || createJobItemMutation.isPending || updateJobMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Quote</h1>
          <p className="text-muted-foreground mt-2">Enter client details and job specifications</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Client Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
              <CardDescription>Enter the client's information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientPhone">Phone</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="0412345678"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="clientAddress">Address</Label>
                <Textarea
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="123 Main St, Sydney NSW 2000"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about the job..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quote Items Section */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Items</CardTitle>
              <CardDescription>Add cladding and cabinet items to the quote</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {quoteItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Item {index + 1}</h3>
                    {quoteItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`itemType-${index}`}>Item Type *</Label>
                    <Select
                      value={item.itemType}
                      onValueChange={(value) =>
                        handleUpdateItem(index, { itemType: value as "cladding" | "cabinet" })
                      }
                    >
                      <SelectTrigger id={`itemType-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cladding">Cladding</SelectItem>
                        <SelectItem value="cabinet">Floating Cabinet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {item.itemType === "cladding" && (
                    <>
                      <div>
                        <Label htmlFor={`claddingVariant-${index}`}>Cladding Design *</Label>
                        <Select
                          value={item.claddingVariantId?.toString() || ""}
                          onValueChange={(value) =>
                            handleUpdateItem(index, { claddingVariantId: parseInt(value) })
                          }
                        >
                          <SelectTrigger id={`claddingVariant-${index}`}>
                            <SelectValue placeholder="Select a cladding design" />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingVariants ? (
                              <div className="p-2">Loading...</div>
                            ) : !claddingVariants || claddingVariants.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">No cladding variants available</div>
                            ) : (
                              claddingVariants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id.toString()}>
                                  {variant.name} - ${(variant.pricePerUnit / 100).toFixed(2)}/unit
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`wallWidth-${index}`}>Wall Width (mm) *</Label>
                          <Input
                            id={`wallWidth-${index}`}
                            type="number"
                            value={item.wallWidthMm || ""}
                            onChange={(e) =>
                              handleUpdateItem(index, { wallWidthMm: parseInt(e.target.value) || undefined })
                            }
                            placeholder="e.g., 3000"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`wallHeight-${index}`}>Wall Height (mm) *</Label>
                          <Input
                            id={`wallHeight-${index}`}
                            type="number"
                            value={item.wallHeightMm || ""}
                            onChange={(e) =>
                              handleUpdateItem(index, { wallHeightMm: parseInt(e.target.value) || undefined })
                            }
                            placeholder="e.g., 2400"
                          />
                        </div>
                      </div>

                      {/* Display wall area and panels needed */}
                      {getWallArea(item) && (
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <div>Wall Area: {getWallArea(item)} m²</div>
                          {getPanelsNeeded(item) && (
                            <div>Panels Needed: {getPanelsNeeded(item)}</div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {item.itemType === "cabinet" && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`cabinetWidth-${index}`}>Width (mm) *</Label>
                          <Input
                            id={`cabinetWidth-${index}`}
                            type="number"
                            value={item.cabinetWidthMm || ""}
                            onChange={(e) =>
                              handleUpdateItem(index, { cabinetWidthMm: parseInt(e.target.value) || undefined })
                            }
                            placeholder="e.g., 1200"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`cabinetHeight-${index}`}>Height (mm) *</Label>
                          <Input
                            id={`cabinetHeight-${index}`}
                            type="number"
                            value={item.cabinetHeightMm || ""}
                            onChange={(e) =>
                              handleUpdateItem(index, { cabinetHeightMm: parseInt(e.target.value) || undefined })
                            }
                            placeholder="e.g., 600"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`cabinetDepth-${index}`}>Depth (mm) *</Label>
                          <Input
                            id={`cabinetDepth-${index}`}
                            type="number"
                            value={item.cabinetDepthMm || ""}
                            onChange={(e) =>
                              handleUpdateItem(index, { cabinetDepthMm: parseInt(e.target.value) || undefined })
                            }
                            placeholder="e.g., 300"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor={`manualPrice-${index}`}>
                      {item.itemType === "cabinet" ? "Price ($) *" : "Manual Price Override ($)"}
                    </Label>
                    <Input
                      id={`manualPrice-${index}`}
                      type="number"
                      step="0.01"
                      value={item.manualPriceOverride ? (item.manualPriceOverride / 100).toFixed(2) : ""}
                      onChange={(e) => {
                        const value = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined;
                        handleUpdateItem(index, { manualPriceOverride: value });
                      }}
                      placeholder={item.itemType === "cabinet" ? "Required" : "Leave empty for automatic calculation"}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>
            </CardContent>
          </Card>

          {/* Estimate Summary */}
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle>Estimate Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${(totalEstimate / 100).toFixed(2)}
              </div>
              <p className="text-muted-foreground mt-2">
                Total estimated cost for this quote
              </p>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Quote...
              </>
            ) : (
              "Create Quote"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
