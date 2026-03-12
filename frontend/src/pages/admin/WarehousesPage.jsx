import React, { useEffect, useState, useMemo } from "react";
import { Warehouse, Plus, Search, Edit2, Trash2, MapPin, Phone, Mail, X, Building } from "lucide-react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const warehouseTypes = [
  { value: "general", label: "General" },
  { value: "cold_storage", label: "Cold Storage" },
  { value: "hazmat", label: "Hazardous Materials" },
  { value: "finished_goods", label: "Finished Goods" },
  { value: "raw_materials", label: "Raw Materials" },
];

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState(null);

  const initialForm = {
    name: "",
    code: "",
    address: "",
    city: "",
    country: "Tanzania",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    capacity_units: 0,
    current_utilization: 0,
    warehouse_type: "general",
    notes: "",
    is_active: true,
  };

  const [form, setForm] = useState(initialForm);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/warehouses");
      setWarehouses(res.data || []);
    } catch (error) {
      console.error("Failed to load warehouses:", error);
      toast.error("Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/api/admin/warehouses/stats/summary");
      setStats(res.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadStats();
  }, []);

  const saveWarehouse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        capacity_units: Number(form.capacity_units),
        current_utilization: Number(form.current_utilization),
      };

      if (editingWarehouse) {
        await api.put(`/api/admin/warehouses/${editingWarehouse.id}`, payload);
        toast.success("Warehouse updated successfully");
      } else {
        await api.post("/api/admin/warehouses", payload);
        toast.success("Warehouse created successfully");
      }

      setForm(initialForm);
      setShowForm(false);
      setEditingWarehouse(null);
      loadWarehouses();
      loadStats();
    } catch (error) {
      console.error("Failed to save warehouse:", error);
      toast.error(error.response?.data?.detail || "Failed to save warehouse");
    }
  };

  const editWarehouse = (warehouse) => {
    setForm({
      name: warehouse.name || "",
      code: warehouse.code || "",
      address: warehouse.address || "",
      city: warehouse.city || "",
      country: warehouse.country || "Tanzania",
      contact_name: warehouse.contact_name || "",
      contact_phone: warehouse.contact_phone || "",
      contact_email: warehouse.contact_email || "",
      capacity_units: warehouse.capacity_units || 0,
      current_utilization: warehouse.current_utilization || 0,
      warehouse_type: warehouse.warehouse_type || "general",
      notes: warehouse.notes || "",
      is_active: warehouse.is_active !== false,
    });
    setEditingWarehouse(warehouse);
    setShowForm(true);
  };

  const deleteWarehouse = async (warehouseId) => {
    if (!window.confirm("Are you sure you want to deactivate this warehouse?")) return;
    try {
      await api.delete(`/api/admin/warehouses/${warehouseId}`);
      toast.success("Warehouse deactivated");
      loadWarehouses();
      loadStats();
    } catch (error) {
      console.error("Failed to delete warehouse:", error);
      toast.error(error.response?.data?.detail || "Failed to delete warehouse");
    }
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredWarehouses = useMemo(() => {
    if (!searchTerm) return warehouses;
    const term = searchTerm.toLowerCase();
    return warehouses.filter(
      (w) =>
        w.name?.toLowerCase().includes(term) ||
        w.code?.toLowerCase().includes(term) ||
        w.city?.toLowerCase().includes(term)
    );
  }, [warehouses, searchTerm]);

  const getUtilizationColor = (utilization, capacity) => {
    if (!capacity) return "bg-slate-100 text-slate-600";
    const percent = (utilization / capacity) * 100;
    if (percent >= 90) return "bg-red-100 text-red-700";
    if (percent >= 70) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="warehouses-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Warehouse className="w-8 h-8 text-[#D4A843]" />
              Warehouse Management
            </h1>
            <p className="text-slate-600 mt-1">Manage storage locations and capacity</p>
          </div>
          <Button
            onClick={() => {
              setForm(initialForm);
              setEditingWarehouse(null);
              setShowForm(true);
            }}
            className="bg-[#2D3E50] hover:bg-[#3d5166]"
            data-testid="create-warehouse-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Warehouse
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border p-4" data-testid="stat-total-warehouses">
              <p className="text-sm text-slate-500">Total Warehouses</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_warehouses}</p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-200 p-4" data-testid="stat-active-warehouses">
              <p className="text-sm text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-700">{stats.active_warehouses}</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4" data-testid="stat-total-capacity">
              <p className="text-sm text-blue-600">Total Capacity</p>
              <p className="text-2xl font-bold text-blue-700">{stats.total_capacity?.toLocaleString()} units</p>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4" data-testid="stat-total-utilization">
              <p className="text-sm text-purple-600">Current Utilization</p>
              <p className="text-2xl font-bold text-purple-700">{stats.total_utilization?.toLocaleString()} units</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, code, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
              data-testid="search-warehouses-input"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
              data-testid="clear-search-btn"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Warehouses Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="warehouses-grid">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-500">Loading...</div>
          ) : filteredWarehouses.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              No warehouses found
            </div>
          ) : (
            filteredWarehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className={`rounded-2xl border bg-white p-5 hover:shadow-md transition ${
                  !warehouse.is_active ? "opacity-60" : ""
                }`}
                data-testid={`warehouse-card-${warehouse.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{warehouse.name}</h3>
                      {!warehouse.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <code className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {warehouse.code}
                    </code>
                  </div>
                  <Badge className={`text-xs ${
                    warehouse.warehouse_type === "cold_storage" ? "bg-blue-100 text-blue-700" :
                    warehouse.warehouse_type === "hazmat" ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {warehouseTypes.find(t => t.value === warehouse.warehouse_type)?.label || warehouse.warehouse_type}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  {warehouse.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{warehouse.address}, {warehouse.city}</span>
                    </div>
                  )}
                  {warehouse.contact_name && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span>{warehouse.contact_name}</span>
                    </div>
                  )}
                  {warehouse.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{warehouse.contact_phone}</span>
                    </div>
                  )}
                </div>

                {/* Capacity Bar */}
                {warehouse.capacity_units > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-500">Utilization</span>
                      <span className={`font-medium px-2 py-0.5 rounded ${getUtilizationColor(warehouse.current_utilization, warehouse.capacity_units)}`}>
                        {Math.round((warehouse.current_utilization / warehouse.capacity_units) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4A843] transition-all"
                        style={{ width: `${Math.min((warehouse.current_utilization / warehouse.capacity_units) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{warehouse.current_utilization?.toLocaleString()} used</span>
                      <span>{warehouse.capacity_units?.toLocaleString()} capacity</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editWarehouse(warehouse)}
                    className="flex-1"
                    data-testid={`edit-warehouse-${warehouse.id}`}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWarehouse(warehouse.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`delete-warehouse-${warehouse.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingWarehouse(null); }}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? "Edit Warehouse" : "Create New Warehouse"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={saveWarehouse} className="space-y-5 pt-4" data-testid="warehouse-form">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Main Warehouse"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                    data-testid="input-warehouse-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    placeholder="e.g., WH-001"
                    value={form.code}
                    onChange={(e) => update("code", e.target.value.toUpperCase())}
                    required
                    disabled={!!editingWarehouse}
                    data-testid="input-warehouse-code"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Warehouse Type</Label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                  value={form.warehouse_type}
                  onChange={(e) => update("warehouse_type", e.target.value)}
                  data-testid="select-warehouse-type"
                >
                  {warehouseTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Street address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  data-testid="input-warehouse-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    data-testid="input-warehouse-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    data-testid="input-warehouse-country"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    placeholder="Manager name"
                    value={form.contact_name}
                    onChange={(e) => update("contact_name", e.target.value)}
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+255..."
                    value={form.contact_phone}
                    onChange={(e) => update("contact_phone", e.target.value)}
                    data-testid="input-contact-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@..."
                    value={form.contact_email}
                    onChange={(e) => update("contact_email", e.target.value)}
                    data-testid="input-contact-email"
                  />
                </div>
              </div>

              {/* Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacity (units)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.capacity_units}
                    onChange={(e) => update("capacity_units", e.target.value)}
                    data-testid="input-capacity"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Utilization</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.current_utilization}
                    onChange={(e) => update("current_utilization", e.target.value)}
                    data-testid="input-utilization"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[80px] resize-none"
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  data-testid="input-warehouse-notes"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingWarehouse(null);
                  }}
                  className="flex-1"
                  data-testid="cancel-warehouse-btn"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-[#D4A843] hover:bg-[#c49933] text-[#2D3E50]" data-testid="save-warehouse-btn">
                  {editingWarehouse ? "Update Warehouse" : "Create Warehouse"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
