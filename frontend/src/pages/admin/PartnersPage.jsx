import React, { useEffect, useState } from "react";
import { Building2, Plus, Check, MapPin, Globe, Phone, Edit2 } from "lucide-react";
import api from "../../lib/api";

export default function PartnersPage() {
  const [items, setItems] = useState([]);
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    partner_type: "distributor",
    contact_person: "",
    email: "",
    phone: "",
    country_code: "TZ",
    regions: [],
    categories: [],
    coverage_mode: "regional",
    fulfillment_type: "partner_fulfilled",
    lead_time_days: 2,
    settlement_terms: "weekly",
    commission_rate: 0,
    address: "",
    notes: "",
  });

  const load = async () => {
    try {
      const [partnersRes, countriesRes] = await Promise.all([
        api.get("/api/admin/partners"),
        api.get("/api/geography/countries"),
      ]);
      setItems(partnersRes.data || []);
      setCountries(countriesRes.data || []);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Seed geography if needed
    api.post("/api/geography/seed").catch(() => {});
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

  const resetForm = () => {
    setForm({
      name: "",
      partner_type: "distributor",
      contact_person: "",
      email: "",
      phone: "",
      country_code: "TZ",
      regions: [],
      categories: [],
      coverage_mode: "regional",
      fulfillment_type: "partner_fulfilled",
      lead_time_days: 2,
      settlement_terms: "weekly",
      commission_rate: 0,
      address: "",
      notes: "",
    });
    setEditingId(null);
  };

  const save = async () => {
    try {
      if (editingId) {
        await api.put(`/api/admin/partners/${editingId}`, form);
      } else {
        await api.post("/api/admin/partners", form);
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to save partner");
    }
  };

  const startEdit = (partner) => {
    setForm({
      name: partner.name || "",
      partner_type: partner.partner_type || "distributor",
      contact_person: partner.contact_person || "",
      email: partner.email || "",
      phone: partner.phone || "",
      country_code: partner.country_code || "TZ",
      regions: partner.regions || [],
      categories: partner.categories || [],
      coverage_mode: partner.coverage_mode || "regional",
      fulfillment_type: partner.fulfillment_type || "partner_fulfilled",
      lead_time_days: partner.lead_time_days || 2,
      settlement_terms: partner.settlement_terms || "weekly",
      commission_rate: partner.commission_rate || 0,
      address: partner.address || "",
      notes: partner.notes || "",
    });
    setEditingId(partner.id);
    setShowForm(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700";
      case "inactive": return "bg-slate-100 text-slate-700";
      case "pending_approval": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const toggleRegion = (region) => {
    if (form.regions.includes(region)) {
      setForm({ ...form, regions: form.regions.filter(r => r !== region) });
    } else {
      setForm({ ...form, regions: [...form.regions, region] });
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partners-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Partners</h1>
          <p className="mt-2 text-slate-600">Manage fulfillment partners across countries</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
          data-testid="add-partner-btn"
        >
          <Plus className="w-5 h-5" />
          Add Partner
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="partner-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">
            {editingId ? "Edit Partner" : "Add Partner"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Partner Name *</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Company name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="partner-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Partner Type</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.partner_type}
                onChange={(e) => setForm({ ...form, partner_type: e.target.value })}
              >
                <option value="distributor">Distributor</option>
                <option value="service_partner">Service Partner</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="print_partner">Print Partner</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Primary contact"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="email"
                placeholder="partner@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="+255 XXX XXX XXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value, regions: [] })}
                data-testid="partner-country-select"
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coverage Mode</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.coverage_mode}
                onChange={(e) => setForm({ ...form, coverage_mode: e.target.value })}
              >
                <option value="national">National (All Regions)</option>
                <option value="regional">Regional (Select Regions)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fulfillment Type</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.fulfillment_type}
                onChange={(e) => setForm({ ...form, fulfillment_type: e.target.value })}
              >
                <option value="partner_fulfilled">Partner Fulfilled</option>
                <option value="konekt_pickup">Konekt Pickup</option>
                <option value="mixed">Mixed</option>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Settlement Terms</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.settlement_terms}
                onChange={(e) => setForm({ ...form, settlement_terms: e.target.value })}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="per_order">Per Order</option>
              </select>
            </div>
          </div>

          {form.coverage_mode === "regional" && regions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Regions Covered</label>
              <div className="flex flex-wrap gap-2">
                {regions.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleRegion(region)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      form.regions.includes(region)
                        ? 'bg-[#2D3E50] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Partner address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Internal notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="save-partner-btn"
            >
              <Check className="w-5 h-5" />
              {editingId ? "Update Partner" : "Save Partner"}
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
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
        <div className="text-center py-10 text-slate-500">No partners yet. Add your first partner.</div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`partner-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{item.name}</div>
                    <div className="text-sm text-slate-500 capitalize">{item.partner_type?.replace("_", " ")}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 rounded-lg hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="w-4 h-4" />
                  {countries.find(c => c.code === item.country_code)?.name || item.country_code}
                  {item.coverage_mode === "regional" && item.regions?.length > 0 && (
                    <span className="text-xs text-slate-400">({item.regions.length} regions)</span>
                  )}
                </div>
                {item.contact_person && (
                  <div className="text-slate-600">{item.contact_person}</div>
                )}
                {item.phone && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-4 h-4" />
                    {item.phone}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-lg text-xs bg-slate-100">
                  {item.lead_time_days} days lead time
                </span>
                <span className="px-2 py-1 rounded-lg text-xs bg-slate-100 capitalize">
                  {item.fulfillment_type?.replace("_", " ")}
                </span>
                <span className="px-2 py-1 rounded-lg text-xs bg-slate-100 capitalize">
                  {item.settlement_terms} settlement
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
