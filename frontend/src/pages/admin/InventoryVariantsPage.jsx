import React, { useEffect, useState, useMemo } from "react";
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Layers, Box, Tag, X } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function InventoryVariantsPage() {
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const initialForm = {
    product_id: "",
    sku: "",
    variant_attributes: { size: "", color: "", material: "" },
    stock_on_hand: 0,
    reserved_stock: 0,
    warehouse_location: "",
    unit_cost: 0,
    selling_price: 0,
    reorder_level: 10,
    is_active: true,
  };

  const [form, setForm] = useState(initialForm);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const params = filterProduct ? `?product_id=${filterProduct}` : "";
      const res = await api.get(`/api/admin/inventory-variants${params}`);
      setVariants(res.data || []);
    } catch (error) {
      console.error("Failed to load variants:", error);
      toast.error("Failed to load inventory variants");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get("/api/admin/products?limit=500");
      setProducts(res.data.products || []);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  useEffect(() => {
    loadVariants();
    loadProducts();
  }, [filterProduct]);

  const saveVariant = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        stock_on_hand: Number(form.stock_on_hand),
        reserved_stock: Number(form.reserved_stock),
        unit_cost: Number(form.unit_cost),
        selling_price: Number(form.selling_price),
        reorder_level: Number(form.reorder_level),
      };

      if (editingVariant) {
        await api.put(`/api/admin/inventory-variants/${editingVariant.id}`, payload);
        toast.success("Variant updated successfully");
      } else {
        await api.post("/api/admin/inventory-variants", payload);
        toast.success("Variant created successfully");
      }

      setForm(initialForm);
      setShowForm(false);
      setEditingVariant(null);
      loadVariants();
    } catch (error) {
      console.error("Failed to save variant:", error);
      toast.error(error.response?.data?.detail || "Failed to save variant");
    }
  };

  const editVariant = (variant) => {
    setForm({
      product_id: variant.product_id || "",
      sku: variant.sku || "",
      variant_attributes: variant.variant_attributes || { size: "", color: "", material: "" },
      stock_on_hand: variant.stock_on_hand || 0,
      reserved_stock: variant.reserved_stock || 0,
      warehouse_location: variant.warehouse_location || "",
      unit_cost: variant.unit_cost || 0,
      selling_price: variant.selling_price || 0,
      reorder_level: variant.reorder_level || 10,
      is_active: variant.is_active !== false,
    });
    setEditingVariant(variant);
    setShowForm(true);
  };

  const deleteVariant = async (variantId) => {
    if (!window.confirm("Are you sure you want to deactivate this variant?")) return;
    try {
      await api.delete(`/api/admin/inventory-variants/${variantId}`);
      toast.success("Variant deactivated");
      loadVariants();
    } catch (error) {
      console.error("Failed to delete variant:", error);
      toast.error(error.response?.data?.detail || "Failed to delete variant");
    }
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateAttr = (key, value) =>
    setForm((prev) => ({
      ...prev,
      variant_attributes: { ...prev.variant_attributes, [key]: value },
    }));

  const filteredVariants = useMemo(() => {
    let result = variants;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.sku?.toLowerCase().includes(term) ||
          v.product_title?.toLowerCase().includes(term) ||
          v.warehouse_location?.toLowerCase().includes(term)
      );
    }
    if (showLowStock) {
      result = result.filter((v) => v.stock_on_hand - (v.reserved_stock || 0) <= v.reorder_level);
    }
    return result;
  }, [variants, searchTerm, showLowStock]);

  const stats = useMemo(() => {
    const totalVariants = variants.length;
    const activeVariants = variants.filter((v) => v.is_active !== false).length;
    const lowStockCount = variants.filter(
      (v) => v.stock_on_hand - (v.reserved_stock || 0) <= v.reorder_level
    ).length;
    const totalStockValue = variants.reduce(
      (acc, v) => acc + (v.stock_on_hand || 0) * (v.unit_cost || 0),
      0
    );
    return { totalVariants, activeVariants, lowStockCount, totalStockValue };
  }, [variants]);

  const getProductName = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.name || "Unknown Product";
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="inventory-variants-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="w-8 h-8 text-[#D4A843]" />
              Product Variants (SKUs)
            </h1>
            <p className="text-slate-600 mt-1">Manage SKU-level inventory with product linking</p>
          </div>
          <Button
            onClick={() => {
              setForm(initialForm);
              setEditingVariant(null);
              setShowForm(true);
            }}
            className="bg-[#2D3E50] hover:bg-[#3d5166]"
            data-testid="create-variant-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Variant
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border p-4" data-testid="stat-total-variants">
            <p className="text-sm text-slate-500">Total Variants</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalVariants}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4" data-testid="stat-active-variants">
            <p className="text-sm text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-700">{stats.activeVariants}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4" data-testid="stat-low-stock">
            <p className="text-sm text-amber-600">Low Stock</p>
            <p className="text-2xl font-bold text-amber-700">{stats.lowStockCount}</p>
          </div>
          <div className="rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30 p-4" data-testid="stat-stock-value">
            <p className="text-sm text-[#9a6d00]">Total Stock Value</p>
            <p className="text-lg font-bold text-[#9a6d00]">{formatMoney(stats.totalStockValue)}</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {stats.lowStockCount > 0 && (
          <div
            className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3"
            data-testid="low-stock-alert"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800">
              <strong>{stats.lowStockCount}</strong> variant(s) are below reorder level
            </span>
            <button
              onClick={() => setShowLowStock(!showLowStock)}
              className="ml-auto text-sm font-medium text-amber-700 hover:underline"
              data-testid="toggle-low-stock-btn"
            >
              {showLowStock ? "Show all" : "Show low stock only"}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by SKU, product, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
              data-testid="search-variants-input"
            />
          </div>

          <select
            className="border border-slate-300 rounded-xl px-4 py-2.5 bg-white"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            data-testid="filter-product-select"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {(searchTerm || filterProduct || showLowStock) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterProduct("");
                setShowLowStock(false);
              }}
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
              data-testid="clear-filters-btn"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Variants Table */}
        <div className="rounded-2xl border bg-white overflow-hidden" data-testid="variants-table">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold">SKU</th>
                  <th className="px-5 py-4 text-sm font-semibold">Product</th>
                  <th className="px-5 py-4 text-sm font-semibold">Attributes</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">On Hand</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Reserved</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Available</th>
                  <th className="px-5 py-4 text-sm font-semibold">Location</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Unit Cost</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Price</th>
                  <th className="px-5 py-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredVariants.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-slate-500">
                      No variants found
                    </td>
                  </tr>
                ) : (
                  filteredVariants.map((variant) => {
                    const available = variant.stock_on_hand - (variant.reserved_stock || 0);
                    const isLow = available <= variant.reorder_level;
                    return (
                      <tr
                        key={variant.id}
                        className={`border-b last:border-b-0 hover:bg-slate-50 ${isLow ? "bg-amber-50/50" : ""}`}
                        data-testid={`variant-row-${variant.id}`}
                      >
                        <td className="px-5 py-4">
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                            {variant.sku}
                          </code>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium">{variant.product_title || getProductName(variant.product_id)}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(variant.variant_attributes || {}).map(([key, val]) =>
                              val ? (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {val}
                                </Badge>
                              ) : null
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium">{variant.stock_on_hand}</td>
                        <td className="px-5 py-4 text-right text-slate-500">{variant.reserved_stock || 0}</td>
                        <td className={`px-5 py-4 text-right font-bold ${isLow ? "text-red-600" : "text-green-600"}`}>
                          {available}
                          {isLow && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{variant.warehouse_location || "—"}</td>
                        <td className="px-5 py-4 text-right">{formatMoney(variant.unit_cost || 0)}</td>
                        <td className="px-5 py-4 text-right font-medium">{formatMoney(variant.selling_price || 0)}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editVariant(variant)}
                              className="p-2 rounded-lg hover:bg-slate-100"
                              title="Edit"
                              data-testid={`edit-variant-${variant.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteVariant(variant.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                              title="Deactivate"
                              data-testid={`delete-variant-${variant.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingVariant(null); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVariant ? "Edit Variant" : "Create New Variant"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={saveVariant} className="space-y-6 pt-4" data-testid="variant-form">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label>Parent Product *</Label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                  value={form.product_id}
                  onChange={(e) => update("product_id", e.target.value)}
                  required
                  disabled={!!editingVariant}
                  data-testid="select-product"
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.branch})
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  placeholder="e.g., CAP-RED-L"
                  value={form.sku}
                  onChange={(e) => update("sku", e.target.value.toUpperCase())}
                  required
                  disabled={!!editingVariant}
                  data-testid="input-sku"
                />
              </div>

              {/* Variant Attributes */}
              <div className="space-y-2">
                <Label>Variant Attributes</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Size (e.g., L, XL)"
                    value={form.variant_attributes.size || ""}
                    onChange={(e) => updateAttr("size", e.target.value)}
                    data-testid="input-attr-size"
                  />
                  <Input
                    placeholder="Color (e.g., Red)"
                    value={form.variant_attributes.color || ""}
                    onChange={(e) => updateAttr("color", e.target.value)}
                    data-testid="input-attr-color"
                  />
                  <Input
                    placeholder="Material (e.g., Cotton)"
                    value={form.variant_attributes.material || ""}
                    onChange={(e) => updateAttr("material", e.target.value)}
                    data-testid="input-attr-material"
                  />
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Stock on Hand *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stock_on_hand}
                    onChange={(e) => update("stock_on_hand", e.target.value)}
                    required
                    data-testid="input-stock-on-hand"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reserved Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.reserved_stock}
                    onChange={(e) => update("reserved_stock", e.target.value)}
                    data-testid="input-reserved-stock"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.reorder_level}
                    onChange={(e) => update("reorder_level", e.target.value)}
                    data-testid="input-reorder-level"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Cost (TZS)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_cost}
                    onChange={(e) => update("unit_cost", e.target.value)}
                    data-testid="input-unit-cost"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price (TZS)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.selling_price}
                    onChange={(e) => update("selling_price", e.target.value)}
                    data-testid="input-selling-price"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Warehouse Location</Label>
                <Input
                  placeholder="e.g., Aisle 3, Shelf B"
                  value={form.warehouse_location}
                  onChange={(e) => update("warehouse_location", e.target.value)}
                  data-testid="input-warehouse-location"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVariant(null);
                  }}
                  className="flex-1"
                  data-testid="cancel-variant-btn"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-[#D4A843] hover:bg-[#c49933] text-[#2D3E50]" data-testid="save-variant-btn">
                  {editingVariant ? "Update Variant" : "Create Variant"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
