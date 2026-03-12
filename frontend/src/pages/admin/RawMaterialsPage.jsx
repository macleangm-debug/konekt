import React, { useEffect, useState, useMemo } from "react";
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, ArrowUpDown, X, Boxes, Truck } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const unitsOfMeasure = [
  "units", "kg", "g", "meters", "cm", "liters", "ml", "sheets", "rolls", "boxes", "pairs"
];

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [adjustingMaterial, setAdjustingMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [stats, setStats] = useState(null);

  const initialForm = {
    name: "",
    sku: "",
    description: "",
    category: "",
    unit_of_measure: "units",
    quantity_on_hand: 0,
    reserved_quantity: 0,
    reorder_level: 10,
    unit_cost: 0,
    supplier_name: "",
    supplier_contact: "",
    warehouse_id: "",
    warehouse_location: "",
    lead_time_days: 7,
    notes: "",
    is_active: true,
  };

  const [form, setForm] = useState(initialForm);
  const [adjustForm, setAdjustForm] = useState({ type: "add", quantity: 0, reason: "" });

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const params = filterCategory ? `?category=${filterCategory}` : "";
      const res = await api.get(`/api/admin/raw-materials${params}`);
      setMaterials(res.data || []);
    } catch (error) {
      console.error("Failed to load materials:", error);
      toast.error("Failed to load raw materials");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get("/api/admin/raw-materials/categories");
      setCategories(res.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await api.get("/api/admin/warehouses?is_active=true");
      setWarehouses(res.data || []);
    } catch (error) {
      console.error("Failed to load warehouses:", error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/api/admin/raw-materials/stats/summary");
      setStats(res.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  useEffect(() => {
    loadMaterials();
    loadCategories();
    loadWarehouses();
    loadStats();
  }, [filterCategory]);

  const saveMaterial = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        quantity_on_hand: Number(form.quantity_on_hand),
        reserved_quantity: Number(form.reserved_quantity),
        reorder_level: Number(form.reorder_level),
        unit_cost: Number(form.unit_cost),
        lead_time_days: Number(form.lead_time_days),
      };

      if (editingMaterial) {
        await api.put(`/api/admin/raw-materials/${editingMaterial.id}`, payload);
        toast.success("Material updated successfully");
      } else {
        await api.post("/api/admin/raw-materials", payload);
        toast.success("Material created successfully");
      }

      setForm(initialForm);
      setShowForm(false);
      setEditingMaterial(null);
      loadMaterials();
      loadCategories();
      loadStats();
    } catch (error) {
      console.error("Failed to save material:", error);
      toast.error(error.response?.data?.detail || "Failed to save material");
    }
  };

  const adjustStock = async (e) => {
    e.preventDefault();
    if (!adjustingMaterial) return;

    try {
      await api.post(`/api/admin/raw-materials/${adjustingMaterial.id}/adjust-stock`, {
        type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
      });
      toast.success("Stock adjusted successfully");
      setShowAdjustForm(false);
      setAdjustingMaterial(null);
      setAdjustForm({ type: "add", quantity: 0, reason: "" });
      loadMaterials();
      loadStats();
    } catch (error) {
      console.error("Failed to adjust stock:", error);
      toast.error(error.response?.data?.detail || "Failed to adjust stock");
    }
  };

  const editMaterial = (material) => {
    setForm({
      name: material.name || "",
      sku: material.sku || "",
      description: material.description || "",
      category: material.category || "",
      unit_of_measure: material.unit_of_measure || "units",
      quantity_on_hand: material.quantity_on_hand || 0,
      reserved_quantity: material.reserved_quantity || 0,
      reorder_level: material.reorder_level || 10,
      unit_cost: material.unit_cost || 0,
      supplier_name: material.supplier_name || "",
      supplier_contact: material.supplier_contact || "",
      warehouse_id: material.warehouse_id || "",
      warehouse_location: material.warehouse_location || "",
      lead_time_days: material.lead_time_days || 7,
      notes: material.notes || "",
      is_active: material.is_active !== false,
    });
    setEditingMaterial(material);
    setShowForm(true);
  };

  const deleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to deactivate this material?")) return;
    try {
      await api.delete(`/api/admin/raw-materials/${materialId}`);
      toast.success("Material deactivated");
      loadMaterials();
      loadStats();
    } catch (error) {
      console.error("Failed to delete material:", error);
      toast.error(error.response?.data?.detail || "Failed to delete material");
    }
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredMaterials = useMemo(() => {
    let result = materials;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.name?.toLowerCase().includes(term) ||
          m.sku?.toLowerCase().includes(term) ||
          m.supplier_name?.toLowerCase().includes(term)
      );
    }
    if (showLowStock) {
      result = result.filter((m) => {
        const available = (m.quantity_on_hand || 0) - (m.reserved_quantity || 0);
        return available <= (m.reorder_level || 0);
      });
    }
    return result;
  }, [materials, searchTerm, showLowStock]);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="raw-materials-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Boxes className="w-8 h-8 text-[#D4A843]" />
              Raw Materials
            </h1>
            <p className="text-slate-600 mt-1">Manage materials needed for production</p>
          </div>
          <Button
            onClick={() => {
              setForm(initialForm);
              setEditingMaterial(null);
              setShowForm(true);
            }}
            className="bg-[#2D3E50] hover:bg-[#3d5166]"
            data-testid="create-material-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Material
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border p-4" data-testid="stat-total-materials">
              <p className="text-sm text-slate-500">Total Materials</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_materials}</p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-200 p-4" data-testid="stat-active-materials">
              <p className="text-sm text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-700">{stats.active_materials}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4" data-testid="stat-low-stock-materials">
              <p className="text-sm text-amber-600">Low Stock</p>
              <p className="text-2xl font-bold text-amber-700">{stats.low_stock_count}</p>
            </div>
            <div className="rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30 p-4" data-testid="stat-inventory-value">
              <p className="text-sm text-[#9a6d00]">Inventory Value</p>
              <p className="text-lg font-bold text-[#9a6d00]">{formatMoney(stats.total_inventory_value || 0)}</p>
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {stats?.low_stock_count > 0 && (
          <div
            className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3"
            data-testid="low-stock-alert"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800">
              <strong>{stats.low_stock_count}</strong> material(s) are below reorder level
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
              placeholder="Search by name, SKU, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
              data-testid="search-materials-input"
            />
          </div>

          <select
            className="border border-slate-300 rounded-xl px-4 py-2.5 bg-white"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            data-testid="filter-category-select"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(searchTerm || filterCategory || showLowStock) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("");
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

        {/* Materials Table */}
        <div className="rounded-2xl border bg-white overflow-hidden" data-testid="materials-table">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold">SKU</th>
                  <th className="px-5 py-4 text-sm font-semibold">Name</th>
                  <th className="px-5 py-4 text-sm font-semibold">Category</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">On Hand</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Reserved</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Available</th>
                  <th className="px-5 py-4 text-sm font-semibold">Unit</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Unit Cost</th>
                  <th className="px-5 py-4 text-sm font-semibold">Supplier</th>
                  <th className="px-5 py-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-slate-500">No materials found</td>
                  </tr>
                ) : (
                  filteredMaterials.map((material) => {
                    const available = (material.quantity_on_hand || 0) - (material.reserved_quantity || 0);
                    const isLow = available <= (material.reorder_level || 0);
                    return (
                      <tr
                        key={material.id}
                        className={`border-b last:border-b-0 hover:bg-slate-50 ${isLow ? "bg-amber-50/50" : ""}`}
                        data-testid={`material-row-${material.id}`}
                      >
                        <td className="px-5 py-4">
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">{material.sku}</code>
                        </td>
                        <td className="px-5 py-4 font-medium">{material.name}</td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-xs">{material.category || "—"}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right font-medium">{material.quantity_on_hand || 0}</td>
                        <td className="px-5 py-4 text-right text-slate-500">{material.reserved_quantity || 0}</td>
                        <td className={`px-5 py-4 text-right font-bold ${isLow ? "text-red-600" : "text-green-600"}`}>
                          {available}
                          {isLow && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{material.unit_of_measure}</td>
                        <td className="px-5 py-4 text-right">{formatMoney(material.unit_cost || 0)}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {material.supplier_name ? (
                            <div className="flex items-center gap-1">
                              <Truck className="w-4 h-4" />
                              {material.supplier_name}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setAdjustingMaterial(material);
                                setShowAdjustForm(true);
                              }}
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                              title="Adjust Stock"
                              data-testid={`adjust-stock-${material.id}`}
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => editMaterial(material)}
                              className="p-2 rounded-lg hover:bg-slate-100"
                              title="Edit"
                              data-testid={`edit-material-${material.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMaterial(material.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                              title="Deactivate"
                              data-testid={`delete-material-${material.id}`}
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

        {/* Create/Edit Material Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingMaterial(null); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMaterial ? "Edit Material" : "Create New Material"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={saveMaterial} className="space-y-5 pt-4" data-testid="material-form">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Cotton Fabric"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                    data-testid="input-material-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input
                    placeholder="e.g., RAW-COT-001"
                    value={form.sku}
                    onChange={(e) => update("sku", e.target.value.toUpperCase())}
                    required
                    disabled={!!editingMaterial}
                    data-testid="input-material-sku"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    placeholder="e.g., Fabrics, Papers, Inks"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    list="categories-list"
                    data-testid="input-material-category"
                  />
                  <datalist id="categories-list">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label>Unit of Measure *</Label>
                  <select
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                    value={form.unit_of_measure}
                    onChange={(e) => update("unit_of_measure", e.target.value)}
                    required
                    data-testid="select-unit-of-measure"
                  >
                    {unitsOfMeasure.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[60px] resize-none"
                  placeholder="Material description..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  data-testid="input-material-description"
                />
              </div>

              {/* Stock Info */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Qty on Hand</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity_on_hand}
                    onChange={(e) => update("quantity_on_hand", e.target.value)}
                    data-testid="input-qty-on-hand"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reserved</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.reserved_quantity}
                    onChange={(e) => update("reserved_quantity", e.target.value)}
                    data-testid="input-reserved-qty"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.reorder_level}
                    onChange={(e) => update("reorder_level", e.target.value)}
                    data-testid="input-reorder-level"
                  />
                </div>
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
              </div>

              {/* Supplier */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier Name</Label>
                  <Input
                    placeholder="Supplier company"
                    value={form.supplier_name}
                    onChange={(e) => update("supplier_name", e.target.value)}
                    data-testid="input-supplier-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supplier Contact</Label>
                  <Input
                    placeholder="Phone or email"
                    value={form.supplier_contact}
                    onChange={(e) => update("supplier_contact", e.target.value)}
                    data-testid="input-supplier-contact"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <select
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                    value={form.warehouse_id}
                    onChange={(e) => update("warehouse_id", e.target.value)}
                    data-testid="select-warehouse"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Location in Warehouse</Label>
                  <Input
                    placeholder="e.g., Aisle 3, Shelf B"
                    value={form.warehouse_location}
                    onChange={(e) => update("warehouse_location", e.target.value)}
                    data-testid="input-warehouse-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lead Time (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.lead_time_days}
                    onChange={(e) => update("lead_time_days", e.target.value)}
                    data-testid="input-lead-time"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMaterial(null);
                  }}
                  className="flex-1"
                  data-testid="cancel-material-btn"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-[#D4A843] hover:bg-[#c49933] text-[#2D3E50]" data-testid="save-material-btn">
                  {editingMaterial ? "Update Material" : "Create Material"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stock Adjustment Dialog */}
        <Dialog open={showAdjustForm} onOpenChange={(open) => { setShowAdjustForm(open); if (!open) setAdjustingMaterial(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Stock: {adjustingMaterial?.name}</DialogTitle>
            </DialogHeader>

            <form onSubmit={adjustStock} className="space-y-5 pt-4" data-testid="adjust-stock-form">
              <div className="p-4 bg-slate-50 rounded-xl text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current on hand:</span>
                  <span className="font-bold">{adjustingMaterial?.quantity_on_hand || 0} {adjustingMaterial?.unit_of_measure}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, type: e.target.value }))}
                  data-testid="select-adjust-type"
                >
                  <option value="add">Add Stock (Receiving)</option>
                  <option value="remove">Remove Stock (Usage)</option>
                  <option value="set">Set Stock (Correction)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  required
                  data-testid="input-adjust-quantity"
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="e.g., Received from supplier, Used for order #123"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                  data-testid="input-adjust-reason"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAdjustForm(false);
                    setAdjustingMaterial(null);
                  }}
                  className="flex-1"
                  data-testid="cancel-adjust-btn"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-[#D4A843] hover:bg-[#c49933] text-[#2D3E50]" data-testid="submit-adjust-btn">
                  Adjust Stock
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
