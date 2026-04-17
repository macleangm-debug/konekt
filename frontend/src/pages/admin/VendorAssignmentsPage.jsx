import React, { useState, useEffect, useCallback } from "react";
import { Truck, Plus, X, CheckCircle, AlertTriangle, Package, Wrench } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function VendorAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor_id: "", vendor_type: "product", categories: [], is_preferred: false, notes: "" });

  const load = useCallback(async () => {
    try {
      const [aRes, cRes, vRes] = await Promise.all([
        api.get("/api/admin/vendor-assignments"),
        api.get("/api/admin/catalog-workspace/categories").catch(() => ({ data: [] })),
        api.get("/api/admin/partners?limit=200").catch(() => ({ data: { partners: [] } })),
      ]);
      setAssignments(Array.isArray(aRes.data) ? aRes.data : []);
      const cats = Array.isArray(cRes.data) ? cRes.data : cRes.data?.categories || [];
      setCategories(cats);
      const parts = Array.isArray(vRes.data) ? vRes.data : vRes.data?.partners || [];
      setVendors(parts);
    } catch { setAssignments([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCategory = (catName) => {
    setForm(prev => {
      const cats = prev.categories.map(c => c.name);
      if (cats.includes(catName)) {
        return { ...prev, categories: prev.categories.filter(c => c.name !== catName) };
      } else {
        return { ...prev, categories: [...prev.categories, { name: catName }] };
      }
    });
  };

  const save = async () => {
    if (!form.vendor_id) { toast.error("Select a vendor"); return; }
    if (form.categories.length === 0) { toast.error("Select at least one category"); return; }
    try {
      await api.post("/api/admin/vendor-assignments", form);
      toast.success("Vendor assignment saved");
      setShowForm(false);
      setForm({ vendor_id: "", vendor_type: "product", categories: [], is_preferred: false, notes: "" });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    }
  };

  const remove = async (vendorId) => {
    try {
      await api.delete(`/api/admin/vendor-assignments/${vendorId}`);
      toast.success("Assignment removed");
      load();
    } catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="space-y-6" data-testid="vendor-assignments-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Vendor-Category Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">Assign vendors to product/service categories. Orders auto-split by vendor capability.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#20364D] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a2d40] transition" data-testid="add-assignment-btn">
          <Plus className="w-4 h-4" /> Assign Vendor
        </button>
      </div>

      {/* Assignment Form */}
      {showForm && (
        <div className="bg-white border rounded-2xl p-6 space-y-4" data-testid="assignment-form">
          <h3 className="text-sm font-bold text-[#20364D]">New Vendor Assignment</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Vendor</label>
              <select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" data-testid="vendor-select">
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.partner_id || v.id} value={v.partner_id || v.id}>{v.company_name || v.full_name || v.name} ({v.partner_type || "vendor"})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Vendor Type</label>
              <select value={form.vendor_type} onChange={(e) => setForm({ ...form, vendor_type: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="product">Product Vendor</option>
                <option value="service">Service Vendor</option>
                <option value="both">Both (Product + Service)</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_preferred} onChange={(e) => setForm({ ...form, is_preferred: e.target.checked })} className="rounded" />
                <span className="font-medium">Preferred (Single Source)</span>
              </label>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase mb-2 block">Assign to Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const catName = typeof cat === "string" ? cat : cat.name;
                const active = form.categories.some(c => c.name === catName);
                const isService = (typeof cat === "object" && cat.category_type === "service");
                return (
                  <button key={catName} onClick={() => toggleCategory(catName)} data-testid={`cat-toggle-${catName.replace(/\s/g, "-")}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${active ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                    {isService ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                    {catName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#D4A843] text-[#17283C] hover:bg-[#c49a3d]" data-testid="save-assignment">Save Assignment</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold rounded-xl border text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Assignments List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-2xl">
          <Truck className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-600">No vendor assignments yet</h3>
          <p className="text-sm text-slate-400 mt-1">Assign vendors to categories so orders can be auto-routed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id || a.vendor_id} className="bg-white border rounded-xl p-4" data-testid={`assignment-${a.vendor_id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#20364D]">{a.vendor_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">{a.vendor_type === "both" ? "Product + Service" : a.vendor_type === "service" ? "Service Vendor" : "Product Vendor"}</span>
                      {a.is_preferred && <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold">Preferred</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => remove(a.vendor_id)} className="text-slate-400 hover:text-red-500 transition" title="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(a.categories || []).map((cat, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{cat.name || cat}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
