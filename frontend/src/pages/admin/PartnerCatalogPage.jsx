import React, { useEffect, useState } from "react";
import { Package, Plus, Check, DollarSign } from "lucide-react";
import api from "../../lib/api";
import QrCodeButton from "../../components/common/QrCodeButton";

export default function PartnerCatalogPage() {
  const [items, setItems] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    partner_id: "",
    source_type: "product",
    sku: "",
    name: "",
    description: "",
    category: "",
    base_partner_price: 0,
    partner_available_qty: 0,
    partner_status: "in_stock",
    lead_time_days: 2,
    min_order_qty: 1,
    unit: "piece",
  });

  const load = async () => {
    try {
      const [catalogRes, partnersRes] = await Promise.all([
        api.get("/api/admin/partner-catalog"),
        api.get("/api/admin/partners"),
      ]);
      setItems(catalogRes.data || []);
      setPartners(partnersRes.data || []);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      await api.post("/api/admin/partner-catalog", form);
      setShowForm(false);
      setForm({
        partner_id: "",
        source_type: "product",
        sku: "",
        name: "",
        description: "",
        category: "",
        base_partner_price: 0,
        partner_available_qty: 0,
        partner_status: "in_stock",
        lead_time_days: 2,
        min_order_qty: 1,
        unit: "piece",
      });
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to save catalog item");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "in_stock": return "bg-green-100 text-green-700";
      case "low_stock": return "bg-amber-100 text-amber-700";
      case "out_of_stock": return "bg-red-100 text-red-700";
      case "on_request": return "bg-blue-100 text-blue-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-catalog-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Partner Catalog</h1>
          <p className="mt-2 text-slate-600">Products and services available from partners</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
          data-testid="add-catalog-item-btn"
        >
          <Plus className="w-5 h-5" />
          Add Catalog Item
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="catalog-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Add Catalog Item</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Partner *</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                data-testid="partner-select"
              >
                <option value="">Select Partner</option>
                {partners.filter(p => p.status === "active").map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.source_type}
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Product/Service SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                data-testid="sku-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Product/Service name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="item-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="e.g., printing, branding"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Partner Price *</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                placeholder="Price partner charges Konekt"
                value={form.base_partner_price}
                onChange={(e) => setForm({ ...form, base_partner_price: parseFloat(e.target.value) || 0 })}
                data-testid="partner-price-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Available Quantity</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                placeholder="Quantity allocated to Konekt"
                value={form.partner_available_qty}
                onChange={(e) => setForm({ ...form, partner_available_qty: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.partner_status}
                onChange={(e) => setForm({ ...form, partner_status: e.target.value })}
              >
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="on_request">On Request</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Time (Days)</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 2 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Order Qty</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                value={form.min_order_qty}
                onChange={(e) => setForm({ ...form, min_order_qty: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="piece, kg, hour, etc."
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Product/service description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="save-catalog-btn"
            >
              <Check className="w-5 h-5" />
              Save Catalog Item
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 rounded-xl border font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No catalog items yet.</div>
      ) : (
        <div className="grid xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-5" data-testid={`catalog-item-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.sku}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.partner_status)}`}>
                  {item.partner_status?.replace("_", " ")}
                </span>
              </div>

              <div className="mt-3 text-sm text-slate-500">
                {item.partner_name}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#D4A843] font-bold">
                  <DollarSign className="w-4 h-4" />
                  {Number(item.base_partner_price || 0).toLocaleString()}
                </div>
                <div className="text-sm text-slate-500">
                  {item.partner_available_qty} {item.unit}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100">{item.category || "uncategorized"}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100">{item.lead_time_days}d</span>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100">{item.source_type}</span>
                <div className="ml-auto">
                  <QrCodeButton kind="product" id={item.id} label="QR" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
