import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, Edit2 } from "lucide-react";

export default function AdminProducts() {
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    design: "",
    widthMm: "",
    heightMm: "",
    depthMm: "",
    pricePerUnit: "",
    description: "",
  });

  const productTypes = trpc.products.listTypes.useQuery();
  const products = trpc.products.listByType.useQuery(
    { productTypeId: parseInt(selectedTypeId) },
    { enabled: !!selectedTypeId }
  );

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      setFormData({ name: "", design: "", widthMm: "", heightMm: "", depthMm: "", pricePerUnit: "", description: "" });
      setShowForm(false);
      products.refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      setFormData({ name: "", design: "", widthMm: "", heightMm: "", depthMm: "", pricePerUnit: "", description: "" });
      setEditingId(null);
      setShowForm(false);
      products.refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      products.refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) {
      toast.error("Please select a product type");
      return;
    }

    const data = {
      productTypeId: parseInt(selectedTypeId),
      name: formData.name,
      design: formData.design || undefined,
      widthMm: formData.widthMm ? parseInt(formData.widthMm) : undefined,
      heightMm: formData.heightMm ? parseInt(formData.heightMm) : undefined,
      depthMm: formData.depthMm ? parseInt(formData.depthMm) : undefined,
      pricePerUnit: parseInt(formData.pricePerUnit),
      description: formData.description || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      design: product.design || "",
      widthMm: product.widthMm ? String(product.widthMm) : "",
      heightMm: product.heightMm ? String(product.heightMm) : "",
      depthMm: product.depthMm ? String(product.depthMm) : "",
      pricePerUnit: String(product.pricePerUnit / 100),
      description: product.description || "",
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Product Management</h1>

        {/* Product Type Selection */}
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
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product type" />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.data?.map((type) => (
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
            {/* Add/Edit Product Form */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingId ? "Edit Product" : "Add New Product"}</CardTitle>
                {showForm && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({ name: "", design: "", widthMm: "", heightMm: "", depthMm: "", pricePerUnit: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </CardHeader>
              {showForm && (
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          placeholder="e.g., Timber Look Panel"
                        />
                      </div>
                      <div>
                        <Label htmlFor="design">Design</Label>
                        <Input
                          id="design"
                          value={formData.design}
                          onChange={(e) => setFormData({ ...formData, design: e.target.value })}
                          placeholder="e.g., Timber, Stone, Modern"
                        />
                      </div>
                      <div>
                        <Label htmlFor="widthMm">Width (mm)</Label>
                        <Input
                          id="widthMm"
                          type="number"
                          value={formData.widthMm}
                          onChange={(e) => setFormData({ ...formData, widthMm: e.target.value })}
                          placeholder="e.g., 300"
                        />
                      </div>
                      <div>
                        <Label htmlFor="heightMm">Height (mm)</Label>
                        <Input
                          id="heightMm"
                          type="number"
                          value={formData.heightMm}
                          onChange={(e) => setFormData({ ...formData, heightMm: e.target.value })}
                          placeholder="e.g., 600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="depthMm">Depth (mm)</Label>
                        <Input
                          id="depthMm"
                          type="number"
                          value={formData.depthMm}
                          onChange={(e) => setFormData({ ...formData, depthMm: e.target.value })}
                          placeholder="e.g., 21"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pricePerUnit">Price ($) *</Label>
                        <Input
                          id="pricePerUnit"
                          type="number"
                          step="0.01"
                          value={formData.pricePerUnit}
                          onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                          required
                          placeholder="e.g., 75.00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
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
              )}
              {!showForm && (
                <CardContent>
                  <Button onClick={() => setShowForm(true)}>+ Add New Product</Button>
                </CardContent>
              )}
            </Card>

            {/* Products List */}
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
                  <p className="text-muted-foreground">No products found for this type.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Name</th>
                          <th className="text-left py-2 px-2">Design</th>
                          <th className="text-left py-2 px-2">Dimensions</th>
                          <th className="text-left py-2 px-2">Price</th>
                          <th className="text-right py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.data?.map((product) => (
                          <tr key={product.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-2">{product.name}</td>
                            <td className="py-2 px-2">{product.design || "-"}</td>
                            <td className="py-2 px-2 text-xs">
                              {product.widthMm && product.heightMm
                                ? `${product.widthMm}×${product.heightMm}${product.depthMm ? `×${product.depthMm}` : ""} mm`
                                : "-"}
                            </td>
                            <td className="py-2 px-2 font-semibold">${(product.pricePerUnit / 100).toFixed(2)}</td>
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
                        ))}
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
