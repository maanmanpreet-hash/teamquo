import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Edit2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  parseMaterialMetadata,
  type OrientationRule,
} from "@shared/quoteCalculations";

const nonStockedProductTypeSlugs = new Set([
  "floating-cabinets",
  "tv-backdrop",
  "side-towers",
  "shelving",
]);

const materialRuleProductTypeSlugs = new Set([
  "cladding",
  "acoustic-panels",
  "marble-sheet",
]);

interface ProductFormData {
  name: string;
  design: string;
  widthMm: string;
  heightMm: string;
  depthMm: string;
  pricePerUnit: string;
  supplier: string;
  wastagePercent: string;
  orientationRule: OrientationRule;
  materialNotes: string;
}

const emptyFormData: ProductFormData = {
  name: "",
  design: "",
  widthMm: "",
  heightMm: "",
  depthMm: "",
  pricePerUnit: "",
  supplier: "",
  wastagePercent: "10",
  orientationRule: "vertical",
  materialNotes: "",
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function parsePositiveInteger(value: string, label: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    toast.error(`${label} must be a positive whole number`);
    return null;
  }
  return parsed;
}

function buildStructuredDescription(formData: ProductFormData, includeMaterialRules: boolean) {
  const lines: string[] = [];

  if (formData.supplier.trim()) {
    lines.push(`Supplier: ${formData.supplier.trim()}`);
  }

  if (includeMaterialRules && formData.wastagePercent.trim()) {
    lines.push(`Wastage: ${formData.wastagePercent.trim()}%`);
  }

  if (includeMaterialRules) {
    lines.push(`Orientation: ${formData.orientationRule}`);
  }

  if (formData.materialNotes.trim()) {
    lines.push(`Notes: ${formData.materialNotes.trim()}`);
  }

  return lines.join("\n");
}

function formDataFromProduct(product: any): ProductFormData {
  const metadata = parseMaterialMetadata(product.description);
  const hasStructuredMetadata =
    metadata.supplier !== undefined ||
    metadata.wastagePercent !== undefined ||
    metadata.orientationRule !== undefined ||
    metadata.notes !== undefined;

  return {
    name: product.name,
    design: product.design || "",
    widthMm: product.widthMm ? String(product.widthMm) : "",
    heightMm: product.heightMm ? String(product.heightMm) : "",
    depthMm: product.depthMm ? String(product.depthMm) : "",
    pricePerUnit: (product.pricePerUnit / 100).toFixed(2),
    supplier: metadata.supplier || "",
    wastagePercent:
      metadata.wastagePercent !== undefined ? String(metadata.wastagePercent) : "10",
    orientationRule: metadata.orientationRule || "vertical",
    materialNotes: metadata.notes || (!hasStructuredMetadata ? product.description || "" : ""),
  };
}

function resetFormData() {
  return { ...emptyFormData };
}

export default function AdminProducts() {
  const [, navigate] = useLocation();
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(resetFormData());

  const productTypes = trpc.products.listTypes.useQuery();
  const products = trpc.products.listByType.useQuery(
    { productTypeId: parseInt(selectedTypeId) },
    { enabled: !!selectedTypeId }
  );
  const stockedProductTypes = productTypes.data?.filter(
    type => !nonStockedProductTypeSlugs.has(type.slug)
  );
  const selectedProductType = stockedProductTypes?.find(type => String(type.id) === selectedTypeId);
  const supportsMaterialRules = selectedProductType
    ? materialRuleProductTypeSlugs.has(selectedProductType.slug)
    : false;

  const resetAndCloseForm = () => {
    setFormData(resetFormData());
    setEditingId(null);
    setShowForm(false);
  };

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      resetAndCloseForm();
      products.refetch();
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      resetAndCloseForm();
      products.refetch();
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      products.refetch();
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const parsePriceToCents = (value: string) => {
    const dollars = Number(value);
    if (!Number.isFinite(dollars)) {
      toast.error("Price must be a numeric dollar amount");
      return null;
    }
    if (dollars < 0) {
      toast.error("Price must be greater than or equal to $0.00");
      return null;
    }
    return Math.round(dollars * 100);
  };

  const parseWastage = (value: string) => {
    const wastage = Number(value);
    if (!Number.isFinite(wastage) || wastage < 0 || wastage > 100) {
      toast.error("Wastage must be a number from 0 to 100");
      return null;
    }
    return wastage;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) {
      toast.error("Please select a product type");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    const pricePerUnit = parsePriceToCents(formData.pricePerUnit);
    if (pricePerUnit === null) return;

    const widthMm = parsePositiveInteger(formData.widthMm, "Width");
    if (widthMm === null) return;
    const heightMm = parsePositiveInteger(formData.heightMm, "Height");
    if (heightMm === null) return;
    const depthMm = parsePositiveInteger(formData.depthMm, "Depth");
    if (depthMm === null) return;

    const wastage = supportsMaterialRules ? parseWastage(formData.wastagePercent) : null;
    if (supportsMaterialRules && wastage === null) return;

    const data = {
      productTypeId: parseInt(selectedTypeId),
      name: formData.name.trim(),
      design: formData.design.trim() || undefined,
      widthMm,
      heightMm,
      depthMm,
      pricePerUnit,
      description: buildStructuredDescription({
        ...formData,
        wastagePercent: supportsMaterialRules ? String(wastage) : "",
      }, supportsMaterialRules),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData(formDataFromProduct(product));
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSelectedTypeChange = (value: string) => {
    setSelectedTypeId(value);
    resetAndCloseForm();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Button variant="outline" onClick={() => navigate("/admin")} className="h-10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">Product Management</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Edit product size, cost, supplier, and product notes used by the quote calculator.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Product Type</CardTitle>
          </CardHeader>
          <CardContent>
            {productTypes.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" />
                Loading product types...
              </div>
            ) : (
              <Select value={selectedTypeId} onValueChange={handleSelectedTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product type" />
                </SelectTrigger>
                <SelectContent>
                  {stockedProductTypes?.map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedTypeId && (
          <>
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingId ? "Edit Product" : "Add New Product"}</CardTitle>
                {showForm && (
                  <Button variant="outline" onClick={resetAndCloseForm}>
                    Cancel
                  </Button>
                )}
              </CardHeader>
              {showForm ? (
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={e =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                          placeholder="e.g., Timber Look Panel"
                        />
                      </div>
                      <div>
                        <Label htmlFor="design">Design</Label>
                        <Input
                          id="design"
                          value={formData.design}
                          onChange={e =>
                            setFormData({ ...formData, design: e.target.value })
                          }
                          placeholder="e.g., Timber, Stone, Modern"
                        />
                      </div>
                      <div>
                        <Label htmlFor="widthMm">Width (mm)</Label>
                        <Input
                          id="widthMm"
                          type="number"
                          value={formData.widthMm}
                          onChange={e =>
                            setFormData({ ...formData, widthMm: e.target.value })
                          }
                          placeholder="e.g., 600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="heightMm">Height (mm)</Label>
                        <Input
                          id="heightMm"
                          type="number"
                          value={formData.heightMm}
                          onChange={e =>
                            setFormData({ ...formData, heightMm: e.target.value })
                          }
                          placeholder="e.g., 2900"
                        />
                      </div>
                      <div>
                        <Label htmlFor="depthMm">Thickness / Depth (mm)</Label>
                        <Input
                          id="depthMm"
                          type="number"
                          value={formData.depthMm}
                          onChange={e =>
                            setFormData({ ...formData, depthMm: e.target.value })
                          }
                          placeholder="e.g., 21"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pricePerUnit">Price per panel/sheet ($) *</Label>
                        <Input
                          id="pricePerUnit"
                          type="number"
                          step="0.01"
                          value={formData.pricePerUnit}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              pricePerUnit: e.target.value,
                            })
                          }
                          required
                          placeholder="e.g., 75.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="supplier">Supplier</Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={e =>
                            setFormData({ ...formData, supplier: e.target.value })
                          }
                          placeholder="e.g., Bunnings, Laminex, Supplier name"
                        />
                      </div>
                      {supportsMaterialRules && (
                        <>
                          <div>
                            <Label htmlFor="wastagePercent">Default Wastage (%) *</Label>
                            <Input
                              id="wastagePercent"
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={formData.wastagePercent}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  wastagePercent: e.target.value,
                                })
                              }
                              required
                              placeholder="e.g., 10"
                            />
                          </div>
                          <div>
                            <Label>Install Orientation Rule *</Label>
                            <Select
                              value={formData.orientationRule}
                              onValueChange={value =>
                                setFormData({
                                  ...formData,
                                  orientationRule: value as OrientationRule,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vertical">Vertical / as supplied</SelectItem>
                                <SelectItem value="horizontal">Horizontal / rotated</SelectItem>
                                <SelectItem value="either">Either - choose lower risk</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="materialNotes">Material Notes</Label>
                      <Input
                        id="materialNotes"
                        value={formData.materialNotes}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            materialNotes: e.target.value,
                          })
                        }
                        placeholder="e.g., check batch colour, avoid visible joins, confirm stock before quote"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Saved into the existing product description field in structured format. No database migration required.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : editingId ? (
                        "Update Product"
                      ) : (
                        "Add Product"
                      )}
                    </Button>
                  </form>
                </CardContent>
              ) : (
                <CardContent>
                  <Button onClick={() => setShowForm(true)}>+ Add New Product</Button>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent>
                {products.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Loading products...
                  </div>
                ) : products.data?.length === 0 ? (
                  <p className="text-muted-foreground">
                    No products found for this type.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Name</th>
                          <th className="text-left py-2 px-2">Design</th>
                          <th className="text-left py-2 px-2">Dimensions</th>
                          <th className="text-left py-2 px-2">Rules</th>
                          <th className="text-left py-2 px-2">Price</th>
                          <th className="text-right py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.data?.map(product => {
                          const metadata = parseMaterialMetadata(product.description);
                          return (
                            <tr
                              key={product.id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="py-2 px-2">
                                <div className="font-medium">{product.name}</div>
                                {metadata.supplier && (
                                  <div className="text-xs text-muted-foreground">
                                    Supplier: {metadata.supplier}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2">{product.design || "-"}</td>
                              <td className="py-2 px-2 text-xs">
                                {product.widthMm && product.heightMm
                                  ? `${product.widthMm}×${product.heightMm}${product.depthMm ? `×${product.depthMm}` : ""} mm`
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-xs">
                                {supportsMaterialRules ? (
                                  <>
                                    <div>
                                      Wastage: {metadata.wastagePercent ?? 10}%
                                    </div>
                                    <div>
                                      Orientation: {metadata.orientationRule || "vertical"}
                                    </div>
                                  </>
                                ) : (
                                  <div>-</div>
                                )}
                                {metadata.notes && (
                                  <div className="text-muted-foreground max-w-[260px] truncate">
                                    {metadata.notes}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2 font-semibold">
                                {formatMoney(product.pricePerUnit)}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(product)}
                                  className="mr-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(product.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
