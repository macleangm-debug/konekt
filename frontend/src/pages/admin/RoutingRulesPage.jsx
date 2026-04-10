import React, { useEffect, useState } from "react";
import { Route as RouteIcon, Plus, Check, MapPin } from "lucide-react";
import api from "../../lib/api";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";
import { toast } from "sonner";

export default function RoutingRulesPage() {
  const { confirmAction } = useConfirmModal();
  const [items, setItems] = useState([]);
  const [countries, setCountries] = useState([]);
  const [partners, setPartners] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    country_code: "TZ",
    region: "",
    category: "",
    priority_mode: "lead_time",
    preferred_partner_id: "",
    fallback_allowed: true,
    internal_first: true,
    notes: "",
  });

  const load = async () => {
    try {
      const [rulesRes, countriesRes, partnersRes] = await Promise.all([
        api.get("/api/admin/routing-rules"),
        api.get("/api/geography/countries"),
        api.get("/api/admin/partners"),
      ]);
      setItems(rulesRes.data || []);
      setCountries(countriesRes.data || []);
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

  useEffect(() => {
    const loadRegions = async () => {
      if (!form.country_code) return;
      try {
        const res = await api.get(`/api/geography/regions/${form.country_code}`);
        setRegions(res.data || []);
      } catch {
        setRegions([]);
      }
    };
    loadRegions();
  }, [form.country_code]);

  const save = async () => {
    try {
      await api.post("/api/admin/routing-rules", {
        ...form,
        region: form.region || null,
        category: form.category || null,
        preferred_partner_id: form.preferred_partner_id || null,
      });
      setShowForm(false);
      setForm({
        country_code: "TZ",
        region: "",
        category: "",
        priority_mode: "lead_time",
        preferred_partner_id: "",
        fallback_allowed: true,
        internal_first: true,
        notes: "",
      });
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save routing rule");
    }
  };

  const deleteRule = async (id) => {
    confirmAction({
      title: "Delete Routing Rule?",
      message: "This routing rule will be permanently removed.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/api/admin/routing-rules/${id}`);
          load();
        } catch (error) {
          toast.error("Failed to delete");
        }
      },
    });
  };

  const getPriorityLabel = (mode) => {
    switch (mode) {
      case "lead_time": return "Fastest Delivery";
      case "margin": return "Highest Margin";
      case "preferred_partner": return "Preferred Partner";
      case "cost": return "Lowest Cost";
      default: return mode;
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="routing-rules-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Routing Rules</h1>
          <p className="mt-2 text-slate-600">Control how orders are routed to partners by geography</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
          data-testid="add-routing-rule-btn"
        >
          <Plus className="w-5 h-5" />
          Add Routing Rule
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="routing-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Add Routing Rule</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country *</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value, region: "" })}
                data-testid="routing-country-select"
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Region (Optional)</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                <option value="">All Regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category (Optional)</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Leave empty for all categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority Mode</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.priority_mode}
                onChange={(e) => setForm({ ...form, priority_mode: e.target.value })}
                data-testid="priority-mode-select"
              >
                <option value="lead_time">Fastest Delivery (Lead Time)</option>
                <option value="margin">Highest Margin</option>
                <option value="cost">Lowest Customer Cost</option>
                <option value="preferred_partner">Preferred Partner</option>
              </select>
            </div>

            {form.priority_mode === "preferred_partner" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Partner</label>
                <select
                  className="w-full border rounded-xl px-4 py-3"
                  value={form.preferred_partner_id}
                  onChange={(e) => setForm({ ...form, preferred_partner_id: e.target.value })}
                >
                  <option value="">Select Partner</option>
                  {partners.filter(p => p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.internal_first}
                  onChange={(e) => setForm({ ...form, internal_first: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Try internal stock first</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.fallback_allowed}
                  onChange={(e) => setForm({ ...form, fallback_allowed: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Allow fallback</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Internal notes about this rule"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="save-routing-btn"
            >
              <Check className="w-5 h-5" />
              Save Routing Rule
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
        <div className="text-center py-10 text-slate-500">No routing rules yet. Orders will default to fastest lead time.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-5" data-testid={`routing-rule-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <RouteIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-bold">
                      {countries.find(c => c.code === item.country_code)?.name || item.country_code}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.region || "All regions"} • {item.category || "All categories"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteRule(item.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>

              <div className="mt-4">
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#2D3E50] text-white">
                  {getPriorityLabel(item.priority_mode)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {item.internal_first && (
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Internal First</span>
                )}
                {item.fallback_allowed && (
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700">Fallback OK</span>
                )}
                {!item.is_active && (
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700">Inactive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
